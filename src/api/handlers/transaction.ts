import { GET, Path, PathParam, POST, QueryParam } from 'typescript-rest'
import { Transaction, TransactionType } from '../../db/entities/transaction'
import { syncChain } from '../../scripts/sync'
import { In, getRepository, FindManyOptions } from 'typeorm'
import { User } from '../../db/entities/user'

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
    @QueryParam('address') address?: string,
    @QueryParam('types') types?: TransactionType[],
    @QueryParam('page') page: number = 1,
    @QueryParam('per_page') perPage: number = 20,
  ): Promise<Transaction[]> {

    let options: FindManyOptions = {
      take: perPage,
      skip: perPage * (page - 1),
      relations: ['sender', 'recipient', 'parent'],
      order: { createdAt: 'DESC' },
    }

    options.where = {}

    if (types) { options.where.type = In(types) }
    if (address) { options.where.sender = { address } }

    return getRepository(Transaction).find(options)
	}

	@Path('/:txid')
	@GET
	async get (@PathParam('txid') txid: string): Promise<TransactionExtended> {
    const tx = await getRepository(Transaction).findOne(txid, { relations: ['sender', 'recipient', 'parent'] })

    return {
      ...tx,
      extensions: await this.getExtensions(tx),
    }
  }

	@Path('/:txid/users')
	@GET
	async getUsers (
    @PathParam('txid') txid: string,
    @PathParam('type') type: TransactionType.like | TransactionType.rebork = TransactionType.like,
    @QueryParam('page') page: number = 1,
    @QueryParam('per_page') perPage: number = 20,
  ): Promise<User[]> {

    return getRepository(User).createQueryBuilder('users')
      .leftJoin('user.sentTransactions', 'txs')
      .where('txs.parent_txid = :txid', { txid })
      .andWhere('txs.type = :type', { type })
      .orderBy('user.name', 'ASC')
      .limit(perPage)
      .offset(perPage * page)
      .getMany()
  }

  private async getExtensions (tx: Transaction, extensions: Transaction[] = []): Promise<Transaction[]> {
    const ext = await getRepository(Transaction).findOne({ parent: { txid: tx.txid }, type: TransactionType.extension })
    if (!ext) { return extensions }
    extensions.push(ext)
    await this.getExtensions(ext, extensions)
  }
}

export interface TransactionExtended extends Transaction {
  parent: Transaction
  extensions: Transaction[]
}