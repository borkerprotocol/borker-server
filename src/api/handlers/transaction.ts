import { GET, Path, PathParam, POST, QueryParam, HeaderParam } from 'typescript-rest'
import { Transaction, TransactionType } from '../../db/entities/transaction'
import { syncChain } from '../../scripts/sync'
import { getRepository, FindManyOptions, In } from 'typeorm'
import { User } from '../../db/entities/user'
import { ApiUser } from './user'
import { iFollow, iCommentLikeRebork } from '../../util/functions'

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
    @QueryParam('page') page: number = 1,
    @QueryParam('perPage') perPage: number = 20,
  ): Promise<ApiTransaction[]> {

    let options: FindManyOptions<Transaction> = {
      take: perPage,
      skip: perPage * (page - 1),
      relations: ['sender', 'recipient', 'parent', 'parent.sender'],
      order: { createdAt: 'DESC' },
    }
  
    options.where = {}
  
    if (types) { options.where.type = In(types) }
    if (senderAddress) { options.where.sender = { address: senderAddress } }
    if (parentTxid) { options.where.parent = { txid: parentTxid } }
  
    const txs = await getRepository(Transaction).find(options)
  
    return Promise.all(txs.map(async tx => {
      return {
        ...tx,
        ...(await iCommentLikeRebork(myAddress, tx)),
      }
    }))
	}

	@Path('/:txid')
	@GET
	async get (
    @HeaderParam('myAddress') myAddress: string,
    @PathParam('txid') txid: string,
  ): Promise<ApiTransactionExtended> {
    const tx = await getRepository(Transaction).findOne(txid, { relations: ['sender', 'recipient', 'parent'] })

    return {
      ...tx,
      ...(await iCommentLikeRebork(myAddress, tx)),
      extensions: await this.getExtensions(tx),
    }
  }

	@Path('/:txid/users')
	@GET
	async getUsers (
    @HeaderParam('myAddress') myAddress: string,
    @PathParam('txid') txid: string,
    @QueryParam('type') type: TransactionType.like | TransactionType.rebork = TransactionType.like,
    @QueryParam('page') page: number = 1,
    @QueryParam('perPage') perPage: number = 20,
  ): Promise<ApiUser[]> {

    const users = await getRepository(User).createQueryBuilder('users')
      .leftJoin('transactions', 'txs', 'txs.sender_address = users.address')
      .where('txs.parent_txid = :txid', { txid })
      .andWhere('txs.type = :type', { type })
      .orderBy('users.name', 'ASC')
      .limit(perPage)
      .offset(perPage * (page - 1))
      .getMany()

    return Promise.all(users.map(async user => {
      return {
        ...user,
        iFollow: await iFollow(myAddress, user.address),
      }
    }))
  }

  private async getExtensions (tx: Transaction, extensions: Transaction[] = []): Promise<Transaction[]> {
    const ext = await getRepository(Transaction).findOne({ parent: { txid: tx.txid }, type: TransactionType.extension })
    if (!ext) { return extensions }
    extensions.push(ext)
    await this.getExtensions(ext, extensions)
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