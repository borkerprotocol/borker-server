import { GET, Path, PathParam, QueryParam, HeaderParam, Errors, POST } from 'typescript-rest'
import { Transaction, TransactionType } from '../../db/entities/transaction'
import { getRepository } from 'typeorm'
import { User } from '../../db/entities/user'
import { ApiUser } from './user'
import { checkBlocked, iFollowBlock } from '../../util/functions'
import { OrderBy } from '../../util/misc-types'
import * as rpc from '../../util/rpc-requests'

@Path('/transactions')
export class TransactionHandler {

	@Path('/')
	@GET
	async index (
    @HeaderParam('my-address') myAddress: string,
    @QueryParam('senderAddress') senderAddress?: string,
    @QueryParam('parentTxid') parentTxid?: string,
    @QueryParam('types') types?: TransactionType[],
    @QueryParam('tags') tags?: string[],
    @QueryParam('order') order: OrderBy<Transaction> = { createdAt: 'DESC' },
    @QueryParam('filterFollowing') filterFollowing: boolean = false,
    @QueryParam('page') page: string = '1',
    @QueryParam('perPage') perPage: string = '20',
  ): Promise<ApiTransaction[]> {

    const pageNum = Number(page)
    const perPageNum = Number(perPage)

    Object.keys(order).forEach(key => {
      const newkey = `tx.${key}`
      order[newkey] = order[key]
      delete order[key]
    })

    let query = getRepository(Transaction)
      .createQueryBuilder('tx')
      .leftJoinAndSelect('tx.sender', 'sender')
      .where('tx.sender_address NOT IN (SELECT blocked_address FROM blocks WHERE blocker_address = :myAddress)', { myAddress })
      .andWhere('tx.sender_address NOT IN (SELECT blocker_address FROM blocks WHERE blocked_address = :myAddress)', { myAddress })
      .orderBy(order)
      .take(perPageNum)
      .skip(perPageNum * (pageNum - 1))
    
    if (!parentTxid) {
      query
        .leftJoinAndSelect('tx.parent', 'parent')
        .leftJoinAndSelect('parent.sender', 'parentSender')
    }
    if (types) {
      query.andWhere('tx.type IN (:...types)', { types })
    }
    if (tags) {
      query.andWhere('tx.txid IN (SELECT transaction_txid FROM tags WHERE tag_name IN (:...tags))', { tags })
    }
    if (filterFollowing) {
      query.andWhere('tx.sender_address IN (SELECT followed_address FROM follows WHERE follower_address = :myAddress)', { myAddress })
    }
    if (senderAddress) {
      query.andWhere('tx.sender_address = :senderAddress', { senderAddress })
    }
    if (parentTxid) {
      query.andWhere('tx.parent_txid = :parentTxid', { parentTxid })
    }

    const txs = await query.getMany()

    return Promise.all(txs.map(async tx => {
      if (tx.parent) {
        Object.assign(tx.parent, { ...await this.iCommentLikeReborkFlag(myAddress, tx.parent.txid) })
      }
      return {
        ...tx,
        ...(await this.iCommentLikeReborkFlag(myAddress, tx.txid)),
      }
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
  ): Promise<ApiTransactionExtended> {
    
    const tx = await getRepository(Transaction).findOne(txid, { relations: ['sender', 'parent', 'parent.sender'] })
    if (!tx) {
      throw new Errors.NotFoundError('tx not found')
    }

    if (await checkBlocked(myAddress, tx.sender.address)) {
      throw new Errors.NotAcceptableError('blocked')
    }

    // TODO fix this...just hideous
    const extensions: Transaction[] = []
    await this.getExtensions(tx, extensions)

    return {
      ...tx,
      ...(await this.iCommentLikeReborkFlag(myAddress, tx.txid)),
      extensions,
    }
  }

	@Path('/:txid/users')
	@GET
	async indexTxUsers (
    @HeaderParam('my-address') myAddress: string,
    @PathParam('txid') txid: string,
    @QueryParam('type') type: TransactionType.like | TransactionType.rebork | TransactionType.flag,
    @QueryParam('order') order: OrderBy<User> = { createdAt: 'ASC' },
    @QueryParam('page') page: string = '1',
    @QueryParam('perPage') perPage: string = '20',
  ): Promise<ApiUser[]> {

    const pageNum = Number(page)
    const perPageNum = Number(perPage)

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
          .from(Transaction, 'txs')
          .where('parent_txid = :txid', { txid })
          .andWhere('type = :type', { type })
          .getQuery()
        return `address IN ${subQuery}`
      })
      .orderBy(order)
      .take(perPageNum)
      .offset(perPageNum * (pageNum - 1))
      .getMany()

    return Promise.all(users.map(async user => {
      return {
        ...user,
        ...(await iFollowBlock(myAddress, user.address)),
      }
    }))
  }

  private async getExtensions (tx: Transaction, extensions: Transaction[]): Promise<Transaction[]> {
    // get the next extension
    const ext = await getRepository(Transaction)
      .findOne({
        parent: tx,
        type: TransactionType.extension,
      }, {
        relations: ['sender'],
      })

    // if no more extensions, return
    if (!ext) { return }

    // add it to the list, along with the current tx as it's parent
    extensions.push({
      ...ext,
      parent: tx,
    })
    // do it again
    await this.getExtensions(ext, extensions)
  }

  private async iCommentLikeReborkFlag (myAddress: string, txid: string): Promise<{
    iComment: boolean
    iLike: boolean
    iRebork: boolean
    iFlag: boolean,
  }> {

    const repo = getRepository(Transaction)

    const conditions = {
      sender: { address: myAddress },
      parent: { txid },
    }

    const [comment, like, rebork, flag] = await Promise.all([
      repo.findOne({
        ...conditions,
        type: TransactionType.comment,
      }),
      repo.findOne({
        ...conditions,
        type: TransactionType.like,
      }),
      repo.findOne({
        ...conditions,
        type: TransactionType.rebork,
      }),
      repo.findOne({
        ...conditions,
        type: TransactionType.flag,
      }),
    ])
  
    return {
      iComment: !!comment,
      iLike: !!like,
      iRebork: !!rebork,
      iFlag: !!flag,
    }
  }
}

export interface ConstructRequest {
  type: TransactionType
  content?: string
  parent?: {
    txid: string
    tip: string,
  },
}

export interface ApiTransaction extends Transaction {
  iComment: boolean
  iLike: boolean
  iRebork: boolean
  iFlag: boolean
}

export interface ApiTransactionExtended extends ApiTransaction {
  extensions: Transaction[]
}
