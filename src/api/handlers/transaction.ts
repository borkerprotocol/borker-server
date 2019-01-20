import { GET, Path, PathParam, POST, QueryParam } from 'typescript-rest'
import { Transaction, TransactionType } from '../../db/entities/transaction'
import { syncChain } from '../../scripts/sync'
import { In, getRepository, FindManyOptions } from 'typeorm'

@Path('/transactions')
export class TransactionHandler {

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
	async get (@PathParam('txid') txid: string): Promise<Transaction> {
    return getRepository(Transaction).findOne(txid, { relations: ['sender', 'recipient', 'parent'] })
  }
  
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
}