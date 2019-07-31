import { GET, Path, PathParam, QueryParam, HeaderParam, Errors, POST } from 'typescript-rest'
import { Bork } from '../../db/entities/bork'
import { getRepository, IsNull, Brackets, Like, SelectQueryBuilder, getManager, FindOneOptions } from 'typeorm'
import { User } from '../../db/entities/user'
import { checkBlocked, iFollowBlock, isPost } from '../../util/functions'
import { OrderBy, ApiUser, ApiBork } from '../../util/types'
import { BorkType } from 'borker-rs-node'
import * as superdoge from '../../util/superdoge'
import { Tag } from '../../db/entities/tag'

@Path('/borks')
export class BorkHandler {

  @Path('/')
  @GET
  async index(
    @HeaderParam('my-address') myAddress: string,
    @QueryParam('senderAddress') senderAddress?: string,
    @QueryParam('parentTxid') parentTxid?: string,
    @QueryParam('types') types?: BorkType[],
    @QueryParam('tags') tags?: string[],
    @QueryParam('order') order: OrderBy<Bork> = { createdAt: 'DESC' },
    @QueryParam('filterFollowing') filterFollowing: boolean = false,
    @QueryParam('startPosition') startPosition: number = 0,
    @QueryParam('page') page: number = 1,
    @QueryParam('perPage') perPage: number = 20,
  ): Promise<ApiBork[]> {

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
      .andWhere(new Brackets(qb => {
        qb.where('borks.position >= :startPosition', { startPosition })
          .orWhere('borks.position IS NULL')
      }))
      .orderBy(order as any)
      .take(perPage)
      .skip(perPage * (page - 1))

    if (types) {
      query.andWhere('borks.type IN (:...types)', { types })
    }

    if (tags) {
      query.andWhere('borks.txid IN (SELECT bork_txid FROM bork_tags WHERE tag_name IN (:...tags))', { tags })
    }

    let follows
    if (filterFollowing) {
      follows = (qb: SelectQueryBuilder<Bork>) => qb.subQuery()
        .select('recipient_address')
        .from(Bork, 'follows')
        .where('type = :followType', { followType: BorkType.Follow })
        .andWhere('sender_address = :myAddress')
        .getQuery()

      query.andWhere(new Brackets(qb => {
        qb.where(qb2 => `borks.sender_address IN ${follows(qb2)}`)
          .orWhere('borks.sender_address = :myAddress')
      }))
    }

    if (senderAddress) {
      query.andWhere('borks.sender_address = :senderAddress', { senderAddress })
    }

    if (parentTxid) {
      query.andWhere('borks.parent_txid = :parentTxid', { parentTxid })
    } else {
      query
        .leftJoinAndSelect('borks.parent', 'parent')
        .leftJoinAndSelect('parent.sender', 'parentSender')
      if (filterFollowing) {
        query.andWhere(qb => {
          const subQuery = follows(qb)
          return `(borks.type NOT IN ('${BorkType.Like}', '${BorkType.Flag}') OR (parent.sender NOT IN ${subQuery} AND parent.sender <> :myAddress AND bork.sender <> :myAddress))`
        })
      }
    }

    const borks = await query
      .setParameter('myAddress', myAddress)
      .getMany()

    return Promise.all(borks.map(async bork => await this.withCountsAndRelatives(bork, myAddress)))
  }

  @Path('/tags')
  @GET
  async getTags(
    @QueryParam('page') page: number = 1,
    @QueryParam('perPage') perPage: number = 20,
  ): Promise<{ name: string, count: number }[]> {

    const tags = await getRepository(Tag).find({
      take: perPage,
      skip: perPage * (page - 1),
    })

    return Promise.all(tags.map(async tag => {
      return {
        name: tag.name,
        count: await getManager().createQueryBuilder()
          .select('borktags')
          .from('bork_tags', 'borktags')
          .where('tag_name = :name', { name: tag.name })
          .getCount(),
      }
    }))
  }

  @Path('/referenceId')
  @GET
  async getReferenceId(
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
  async broadcast(txs: string[]): Promise<string[]> {
    return superdoge.broadcast(txs)
  }

  @Path('/:txid')
  @GET
  async get(
    @HeaderParam('my-address') myAddress: string,
    @PathParam('txid') txid: string,
    @QueryParam('consolidate') consolidate: boolean = true,
  ): Promise<ApiBork> {

    const bork = await getRepository(Bork).findOne(txid, { relations: ['sender'] })
    if (!bork) {
      throw new Errors.NotFoundError('bork not found')
    }
    if (await checkBlocked(myAddress, bork.sender.address)) {
      throw new Errors.NotAcceptableError('blocked')
    }

    if (consolidate && isPost(bork.type)) {
      const res: { parent_txid: string, content: string } | undefined = (await getRepository(Bork).query(
        `SELECT parent_txid, group_concat(content, '') as content FROM borks WHERE parent_txid = $1 AND type = $2 GROUP BY parent_txid`,
        [bork.txid, BorkType.Extension],
      ))[0]
      if (res) {
        bork.content = bork.content! + res.content
      }
    }

    let parentOptions: FindOneOptions<Bork> = { relations: ['sender'] }
    if (bork.type === BorkType.Extension && bork.position! > 1) {
      parentOptions.where = {
        parent: { txid: bork.parentTxid! },
        type: BorkType.Extension,
        position: bork.position! - 1,
      }
    } else {
      parentOptions.where = { txid: bork.parentTxid! }
    }

    bork.parent = await getRepository(Bork).findOne(parentOptions) || null

    return this.withCountsAndRelatives(bork, myAddress)
  }

  @Path('/:txid/users')
  @GET
  async indexBorkUsers(
    @HeaderParam('my-address') myAddress: string,
    @PathParam('txid') txid: string,
    @QueryParam('type') type: BorkType,
    @QueryParam('order') order: OrderBy<User> = { createdAt: 'ASC' },
    @QueryParam('page') page: number = 1,
    @QueryParam('perPage') perPage: number = 20,
  ): Promise<ApiUser[]> {

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

  private async withCountsAndRelatives(bork: Bork, myAddress: string): Promise<ApiBork> {
    if (isPost(bork.type)) {
      Object.assign(bork, ...await Promise.all([
        this.iCommentReborkFlag(myAddress, bork.txid),
        this.getCounts(bork),
      ]))
    }
    if (bork.parent) {
      Object.assign(bork.parent, ...await Promise.all([
        this.iCommentReborkFlag(myAddress, bork.parent.txid),
        this.getCounts(bork.parent),
      ]))
    }

    return bork
  }

  private async getCounts(bork: Bork): Promise<{
    extensionsCount: number
    commentsCount: number
    reborksCount: number
    likesCount: number
    flagsCount: number
  }> {

    const conditions = {
      parent: { txid: bork.txid },
      deletedAt: IsNull(),
    }
    const query = `SELECT COUNT(*) as count FROM (SELECT DISTINCT sender_address, parent_txid FROM borks WHERE type = $1 AND parent_txid = $2)`

    const [extensionsCount, commentsCount, reborksCount, likesQuery, flagsQuery] = await Promise.all([
      getRepository(Bork).count({
        type: BorkType.Extension,
        parent: { txid: bork.type === BorkType.Extension ? bork.parentTxid! : bork.txid },
        deletedAt: IsNull(),
      }),
      getRepository(Bork).count({ ...conditions, type: BorkType.Comment }),
      getRepository(Bork).count({ ...conditions, type: BorkType.Rebork }),
      getManager().query(query, [BorkType.Like, bork.txid]),
      getManager().query(query, [BorkType.Flag, bork.txid]),
    ])

    return {
      extensionsCount,
      commentsCount,
      reborksCount,
      likesCount: likesQuery[0].count,
      flagsCount: flagsQuery[0].count,
    }
  }

  private async iCommentReborkFlag(myAddress: string, txid: string): Promise<{
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
}
