import { GET, Path, PathParam, QueryParam, HeaderParam, Errors } from 'typescript-rest'
import { getRepository, FindManyOptions } from 'typeorm'
import { User } from '../../db/entities/user'
import { checkBlocked, iFollowBlock } from '../../util/functions'
import { OrderBy } from '../../util/misc-types'
import { Utxo } from '../../db/entities/utxo'

@Path('/users')
export class UserHandler {

	@Path('/')
	@GET
	async index (
    @HeaderParam('my-address') myAddress: string,
    @QueryParam('order') order: OrderBy<User> = { birthBlock: 'ASC' },
    @QueryParam('page') page: string | number = 1,
    @QueryParam('perPage') perPage: string | number = 20,
  ): Promise<ApiUser[]> {

    page = Number(page)
    perPage = Number(perPage)

    let options: FindManyOptions<User> = {
      take: perPage,
      skip: perPage * (page - 1),
      order,
    }
    const users = await getRepository(User).find(options)

    return Promise.all(users.map(async user => {
      return {
        ...user,
        ...(await iFollowBlock(myAddress, user.address)),
      }
    }))
  }

	@Path('/:address')
	@GET
	async get (
    @HeaderParam('my-address') myAddress: string,
    @PathParam('address') address: string,
  ): Promise<ApiUser> {

    if (await checkBlocked(myAddress, address)) {
      throw new Errors.NotAcceptableError('blocked')
    }

    const user = await getRepository(User).findOne(address)
    if (!user) {
      throw new Errors.NotFoundError('user not found')
    }

    return {
      ...user,
      ...(await iFollowBlock(myAddress, user.address)),
    }
  }

	@Path('/:address/balance')
	@GET
	async getBalance (
    @PathParam('address') address: string,
  ): Promise<number> {

    const { sum } = await getRepository(Utxo)
      .createQueryBuilder('utxos')
      .select('SUM(value)', 'sum')
      .where('address = :address', { address })
      .getRawOne() as { sum: number | null }

    return sum || 0
  }

	@Path('/:address/utxos')
	@GET
	async getUtxos (
    @PathParam('address') address: string,
    @QueryParam('amount') amount: string | number,
    @QueryParam('batchSize') batchSize: string | number = 100,
  ): Promise<Utxo[]> {

    batchSize = Number(batchSize)
    amount = Number(amount)

    let page = 1
    let utxos: Utxo[] = []
    let total = 0

    do {
      let options: FindManyOptions<Utxo> = {
        where: { address },
        take: batchSize,
        skip: batchSize * (page - 1),
        order: { value: 'ASC' },
      }
      const moreUtxos = await getRepository(Utxo).find(options)

      utxos = utxos.concat(moreUtxos)

      total = moreUtxos.reduce((previous, utxo) => {
        return previous + utxo.value
      }, total)

      if (moreUtxos.length < batchSize && total < amount) {
        throw new Errors.BadRequestError(`insufficient funds. ${total / 100000000} DOGE available.`)
      }

      page++

    } while (total < amount)

    return utxos
  }

	@Path('/:address/users')
	@GET
	async indexFollows (
    @HeaderParam('my-address') myAddress: string,
    @PathParam('address') address: string,
    @QueryParam('type') type: 'following' | 'followers',
    @QueryParam('order') order: OrderBy<User> = { createdAt: 'ASC' },
    @QueryParam('page') page: string | number = 1,
    @QueryParam('perPage') perPage: string | number = 20,
  ): Promise<ApiUser[]> {

    if (!type || !['following', 'followers'].includes(type)) {
      throw new Errors.BadRequestError('query param "type" must be "following" or "followers"')
    }

    if (await checkBlocked(myAddress, address)) {
      throw new Errors.NotAcceptableError('blocked')
    }

    page = Number(page)
    perPage = Number(perPage)

    Object.keys(order).forEach(key => {
      const newkey = `users.${key}`
      order[newkey] = order[key]
      delete order[key]
    })

    let query = getRepository(User)
      .createQueryBuilder('users')
      .orderBy(order)
      .take(perPage)
      .offset(perPage * (page - 1))

    if (type === 'following') {
      query.where('address IN (SELECT followed_address FROM follows WHERE follower_address = :address)', { address })
    } else {
      query.where('address IN (SELECT follower_address FROM follows WHERE followed_address = :address)', { address })
    }

    const users = await query.getMany()

    return Promise.all(users.map(async user => {
      return {
        ...user,
        ...(await iFollowBlock(myAddress, user.address)),
      }
    }))
  }
}

export interface ApiUser extends User {
  iFollow: boolean
  iBlock: boolean
}
