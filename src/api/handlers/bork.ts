import { GET, Path, PathParam, QueryParam, HeaderParam, Errors, POST } from 'typescript-rest'
import { Bork } from '../../db/entities/bork'
import { getRepository, IsNull, Brackets } from 'typeorm'
import { User } from '../../db/entities/user'
import { ApiUser } from './user'
import { checkBlocked, iFollowBlock } from '../../util/functions'
import { OrderBy } from '../../util/misc-types'
import * as rpc from '../../util/rpc-requests'
import { BorkType } from 'borker-rs-node'

@Path('/borks')
export class BorkHandler {

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
      .orderBy(order)
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
      query.andWhere(qb => {
        const subQuery = qb.subQuery()
          .select('recipient_address')
          .from(Bork, 'borks')
          .where('type = :followType', { followType: BorkType.Follow })
          .andWhere('sender_address = :myAddress')
          .getQuery()
        return `borks.sender_address IN ${subQuery}`
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
        Object.assign(bork.parent, { ...await this.iCommentReborkFlag(myAddress, bork.parent.txid) })
      }
      if ([BorkType.Bork, BorkType.Comment, BorkType.Rebork, BorkType.Extension].includes(bork.type)) {
        Object.assign(bork, ...await Promise.all([
          this.iCommentReborkFlag(myAddress, bork.txid),
          this.getCounts(bork.txid),
        ]))
      }

      return bork
    }))
  }

	@Path('/broadcast')
	@POST
	async broadcast (txs: string[]): Promise<string[]> {

    return Promise.all(txs.map(rpc.broadcast))
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
      .orderBy(order)
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

    const [ commentsCount, reborksCount, likesCount, flagsCount ] = await Promise.all([
      getRepository(Bork).count({ ...conditions, type: BorkType.Comment }),
      getRepository(Bork).count({ ...conditions, type: BorkType.Rebork }),
      getRepository(Bork).count({ ...conditions, type: BorkType.Like }),
      getRepository(Bork).count({ ...conditions, type: BorkType.Flag }),
    ])

    return { commentsCount, reborksCount, likesCount, flagsCount }
  }

  private async iCommentReborkFlag (myAddress: string, txid: string): Promise<{
    iComment: boolean
    iRebork: boolean
    iLike: boolean
    iFlag: boolean
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
      iComment: !!comment,
      iRebork: !!rebork,
      iLike: !!like,
      iFlag: !!flag,
    }
  }
}

export interface ApiBork extends Bork {
  iComment?: boolean
  iRebork?: boolean
  iLike?: boolean
  iFlag?: boolean
  commentsCount?: number
  reborksCount?: number
  likesCount?: number
  flagsCount?: number
}
