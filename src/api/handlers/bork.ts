import { GET, Path, PathParam, QueryParam, HeaderParam, Errors, POST } from 'typescript-rest'
import { Bork } from '../../db/entities/bork'
import { getRepository, IsNull, Brackets, Like, SelectQueryBuilder } from 'typeorm'
import { User } from '../../db/entities/user'
import { checkBlocked, iFollowBlock } from '../../util/functions'
import { OrderBy, ApiUser, ApiBork } from '../../util/types'
import { Superdoge } from '../../util/superdoge'
import { BorkType } from 'borker-rs-node'

@Path('/borks')
export class BorkHandler {

  constructor (
    private readonly superdoge: Superdoge = new Superdoge(),
  ) { }

  @Path('/')
  @GET
  async index (
    @HeaderParam('my-address') myAddress: string,
    @QueryParam('senderAddress') senderAddress?: string,
    @QueryParam('parentTxid') parentTxid?: string,
    @QueryParam('types') types?: BorkType[],
    @QueryParam('tags') tags?: string[],
    @QueryParam('order') order: OrderBy<Bork> = { createdAt: 'DESC' },
    @QueryParam('filterFollowing') filterFollowing: boolean = false,
    @QueryParam('page') page: string | number = 1,
    @QueryParam('perPage') perPage: string | number = 20,
  ): Promise<ApiBork[]> {

    page = Number(page)
    perPage = Number(perPage)

    if (perPage > 40) { throw new Errors.BadRequestError('perPage limit is 40') }

    Object.keys(order).forEach(key => {
      const newkey = `borks.${key}`
      order[newkey] = order[key]
      delete order[key]
    })

    let query = getRepository(Bork)
      .createQueryBuilder('borks')
      .leftJoinAndSelect('borks.sender', 'sender')
      .where(qb => {
        const subQuery = qb.subQuery()
          .select('recipient_address')
          .from(Bork, 'blocks')
          .where('type = :blockType', { blockType: BorkType.Block })
          .andWhere(new Brackets(qb => {
            qb.where('sender_address = :myAddress')
              .orWhere('recipient_address = :myAddress')
          }))
          .getQuery()
        return `borks.sender_address NOT IN ${subQuery}`
      })
      .orderBy(order as any)
      .take(perPage)
      .skip(perPage * (page - 1))

    if (!parentTxid) {
      query
        .leftJoinAndSelect('borks.parent', 'parent')
        .leftJoinAndSelect('parent.sender', 'parentSender')
    }
    if (types) {
      query.andWhere('borks.type IN (:...types)', { types })
    }
    if (tags) {
      query.andWhere('borks.txid IN (SELECT bork_txid FROM bork_tags WHERE tag_name IN (:...tags))', { tags })
    }
    if (filterFollowing) {
      let follows = (qb: SelectQueryBuilder<Bork>) => qb.subQuery()
        .select('recipient_address')
        .from(Bork, 'borks')
        .where('type = :followType', { followType: BorkType.Follow })
        .andWhere('sender_address = :myAddress')
        .getQuery()

      query.andWhere(qb => {
        const subQuery = follows(qb)
        return `(borks.sender_address IN ${subQuery} OR borks.sender_address = :myAddress) AND 
          (borks.type NOT IN ('${BorkType.Like}', '${BorkType.Flag}') OR (borks.recipient_address NOT IN ${subQuery} AND borks.sender_address <> :myAddress))`
      })
    }
    if (senderAddress) {
      query.andWhere('borks.sender_address = :senderAddress', { senderAddress })
    }
    if (parentTxid) {
      query.andWhere('borks.parent_txid = :parentTxid', { parentTxid })
    }

    const borks = await query
      .setParameter('myAddress', myAddress)
      .getMany()

    return Promise.all(borks.map(async bork => {
      if (bork.parent) {
        parentTxid = bork.parent.txid
        bork.parent = Object.assign(bork.parent, ...await Promise.all([
          this.iCommentReborkFlag(myAddress, parentTxid),
          this.getCounts(parentTxid),
          this.getExtensionCount(bork.parent)
        ]))
      }
      if ([BorkType.Bork, BorkType.Comment, BorkType.Rebork, BorkType.Extension].includes(bork.type)) {
        bork = Object.assign(bork, ...await Promise.all([
          this.iCommentReborkFlag(myAddress, bork.txid),
          this.getCounts(bork.txid),
          this.getExtensionCount(bork)
        ]))
      }

      return bork
    }))
  }

  @Path('/referenceId')
  @GET
  async getReferenceId (
    @QueryParam('txid') txid: string,
    @QueryParam('address') address: string,
  ): Promise<{ referenceId: string }> {
    let ref = ''
    let moreThanOne = false
    let i = 1

    do {
      ref = txid.substr(0, i * 2)
      moreThanOne = (await getRepository(Bork).count({ where: { sender: { address }, txid: Like(ref) } })) > 1
      i++
    } while (moreThanOne)

    return { referenceId: ref }
  }

  @Path('/broadcast')
  @POST
  async broadcast (txs: string[]): Promise<string[]> {
    return this.superdoge.broadcast(txs)
  }

  @Path('/:txid')
  @GET
  async get (
    @HeaderParam('my-address') myAddress: string,
    @PathParam('txid') txid: string,
  ): Promise<ApiBork> {

    const bork = await getRepository(Bork).findOne(txid, { relations: ['sender', 'parent', 'parent.sender'] })
    if (!bork) {
      throw new Errors.NotFoundError('bork not found')
    }

    if (await checkBlocked(myAddress, bork.sender.address)) {
      throw new Errors.NotAcceptableError('blocked')
    }

    if ([BorkType.Bork, BorkType.Comment, BorkType.Rebork, BorkType.Extension].includes(bork.type)) {
      Object.assign(bork, ...await Promise.all([
        this.iCommentReborkFlag(myAddress, bork.txid),
        this.getCounts(bork.txid),
      ]))
      if (bork.parent) {
        Object.assign(bork.parent, ...await Promise.all([
          this.iCommentReborkFlag(myAddress, bork.parent.txid),
          this.getCounts(bork.parent.txid),
        ]))
      }
    }

    return bork
  }

  @Path('/:txid/users')
  @GET
  async indexBorkUsers (
    @HeaderParam('my-address') myAddress: string,
    @PathParam('txid') txid: string,
    @QueryParam('type') type: BorkType,
    @QueryParam('order') order: OrderBy<User> = { createdAt: 'ASC' },
    @QueryParam('page') page: string | number = 1,
    @QueryParam('perPage') perPage: string | number = 20,
  ): Promise<ApiUser[]> {

    page = Number(page)
    perPage = Number(perPage)

    if (perPage > 40) { throw new Errors.BadRequestError('perPage limit is 40') }

    Object.keys(order).forEach(key => {
      const newkey = `users.${key}`
      order[newkey] = order[key]
      delete order[key]
    })

    const users = await getRepository(User)
      .createQueryBuilder('users')
      .where(qb => {
        const subQuery = qb.subQuery()
          .select('sender_address')
          .from(Bork, 'borks')
          .where('parent_txid = :txid', { txid })
          .andWhere('type = :type', { type })
          .andWhere('deleted_at IS NULL')
          .getQuery()
        return `address IN ${subQuery}`
      })
      .orderBy(order as any)
      .take(perPage)
      .offset(perPage * (page - 1))
      .getMany()

    return Promise.all(users.map(async user => {
      return {
        ...user,
        ...await iFollowBlock(myAddress, user.address),
      }
    }))
  }

  private async getCounts (txid: string): Promise<{
    commentsCount: number
    reborksCount: number
    likesCount: number
    flagsCount: number
  }> {

    const conditions = {
      parent: { txid },
      deletedAt: IsNull(),
    }

    const [commentsCount, reborksCount, likesCount, flagsCount] = await Promise.all([
      getRepository(Bork).count({ ...conditions, type: BorkType.Comment }),
      getRepository(Bork).count({ ...conditions, type: BorkType.Rebork }),
      getRepository(Bork).count({ ...conditions, type: BorkType.Like }),
      getRepository(Bork).count({ ...conditions, type: BorkType.Flag }),
    ])

    return { commentsCount, reborksCount, likesCount, flagsCount }
  }

  private async iCommentReborkFlag (myAddress: string, txid: string): Promise<{
    iComment: string | null
    iRebork: string | null
    iLike: string | null
    iFlag: string | null
  }> {

    const conditions = {
      sender: { address: myAddress },
      parent: { txid },
      deletedAt: IsNull(),
    }

    const [comment, rebork, like, flag] = await Promise.all([
      getRepository(Bork).findOne({ ...conditions, type: BorkType.Comment }),
      getRepository(Bork).findOne({ ...conditions, type: BorkType.Rebork }),
      getRepository(Bork).findOne({ ...conditions, type: BorkType.Like }),
      getRepository(Bork).findOne({ ...conditions, type: BorkType.Flag }),
    ])

    return {
      iComment: comment ? comment.txid : null,
      iRebork: rebork ? rebork.txid : null,
      iLike: like ? like.txid : null,
      iFlag: flag ? flag.txid : null,
    }
  }

  private async getExtensionCount (bork: Bork): Promise<{ extensionsCount: number }> {
    let txid: string
    if (bork.type === BorkType.Extension) {
      txid = bork.parentTxid!
    } else {
      txid = bork.txid
    }
    return { extensionsCount: 1 + await getRepository(Bork).count({ type: BorkType.Extension, parent: { txid } }) }
  }
}
