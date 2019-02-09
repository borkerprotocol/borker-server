import { GET, Path, PathParam, POST, QueryParam, HeaderParam, Errors } from 'typescript-rest'
import { Transaction, TransactionType } from '../../db/entities/transaction'
import { syncChain } from '../../scripts/sync'
import { getRepository } from 'typeorm'
import { User } from '../../db/entities/user'
import { ApiUser } from './user'
import { checkFollowing, checkBlocked } from '../../util/functions'

@Path('/transactions')
export class TransactionHandler {

	@Path('/sync')
	@POST
	async sync (): Promise<void> {
		syncChain()
  }

	// @Path('/stopSync')
	// @POST
	// async stopSync (): Promise<void> {
	// 	stopSyncChain()
  // }

	@Path('/')
	@GET
	async index (
    @HeaderParam('myAddress') myAddress: string,
    @QueryParam('senderAddress') senderAddress?: string,
    @QueryParam('parentTxid') parentTxid?: string,
    @QueryParam('types') types?: TransactionType[],
    @QueryParam('filterFollowing') filterFollowing: boolean = false,
    @QueryParam('page') page: number = 1,
    @QueryParam('perPage') perPage: number = 20,
  ): Promise<ApiTransaction[]> {

    let query = getRepository(Transaction)
      .createQueryBuilder('tx')
      .leftJoinAndSelect('tx.sender', 'sender')
      .leftJoinAndSelect('tx.parent', 'parent')
      .leftJoinAndSelect('parent.sender', 'parentSender')
      .leftJoinAndSelect('tx.mentions', 'mentions')
      .where('tx.sender_address NOT IN (SELECT blocked_address FROM blocks WHERE blocker_address = :myAddress)', { myAddress })
      .andWhere('tx.sender_address NOT IN (SELECT blocker_address FROM blocks WHERE blocked_address = :myAddress)', { myAddress })
      .orderBy('tx.created_at', 'DESC')
      .limit(perPage)
      .skip(perPage * (page - 1))

    if (types) {
      query.andWhere('tx.type IN (:...types)', { types })
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
        Object.assign(tx.parent, { ...await this.iCommentLikeRebork(myAddress, tx.parent) })
      }
      return {
        ...tx,
        ...(await this.iCommentLikeRebork(myAddress, tx)),
      }
    }))
	}

	@Path('/:txid')
	@GET
	async get (
    @HeaderParam('myAddress') myAddress: string,
    @PathParam('txid') txid: string,
  ): Promise<ApiTransactionExtended> {
    
    const tx = await getRepository(Transaction)
      .findOneOrFail(txid, { relations: ['sender', 'parent', 'parent.sender', 'mentions'] })

    if (await checkBlocked(myAddress, tx.sender.address)) {
      throw new Errors.NotAcceptableError('blocked')
    }

    return {
      ...tx,
      ...(await this.iCommentLikeRebork(myAddress, tx)),
      extensions: await this.getExtensions(tx),
    }
  }

	@Path('/:txid/users')
	@GET
	async indexTxUsers (
    @HeaderParam('myAddress') myAddress: string,
    @PathParam('txid') txid: string,
    @QueryParam('type') type?: TransactionType.like | TransactionType.rebork,
    @QueryParam('page') page: number = 1,
    @QueryParam('perPage') perPage: number = 20,
  ): Promise<ApiUser[]> {

    let query = getRepository(User)
      .createQueryBuilder('users')
      .leftJoin('transactions', 'txs', 'txs.sender_address = users.address')
      .where('txs.parent_txid = :txid', { txid })
      .orderBy('users.name', 'ASC')
      .limit(perPage)
      .offset(perPage * (page - 1))

    if (type) {
      query.andWhere('txs.type = :type', { type })
    }

    const users = await query.getMany()

    return Promise.all(users.map(async user => {
      return {
        ...user,
        iFollow: await checkFollowing(myAddress, user.address),
      }
    }))
  }

  private async getExtensions (tx: Transaction, extensions: Transaction[] = []): Promise<Transaction[]> {
    const ext = await getRepository(Transaction).findOne({ parent: { txid: tx.txid }, type: TransactionType.extension })
    if (!ext) { return extensions }
    extensions.push(ext)
    await this.getExtensions(ext, extensions)
  }

  private async iCommentLikeRebork (myAddress: string, tx: Transaction): Promise<{ iComment: boolean, iLike: boolean, iRebork: boolean }> {
    const repo = getRepository(Transaction)
    const [comment, like, rebork] = await  Promise.all([
      repo.findOne({
        sender: { address: myAddress },
        parent: { txid: tx.txid },
        type: TransactionType.comment,
      }),
      repo.findOne({
        sender: { address: myAddress },
        parent: { txid: tx.txid },
        type: TransactionType.like,
      }),
      repo.findOne({
        sender: { address: myAddress },
        parent: { txid: tx.txid },
        type: TransactionType.rebork,
      }),
    ])
  
    return {
      iComment: !!comment,
      iLike: !!like,
      iRebork: !!rebork,
    }
  }
}

export interface ApiTransaction extends Transaction {
  iComment: boolean
  iLike: boolean
  iRebork: boolean
}

export interface ApiTransactionExtended extends ApiTransaction {
  extensions: Transaction[]
}