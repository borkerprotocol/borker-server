import { GET, Path, PathParam, QueryParam, HeaderParam, Errors } from 'typescript-rest'
import { getRepository, FindManyOptions } from 'typeorm'
import { User } from '../../db/entities/user'
import { checkFollowing, checkBlocked } from '../../util/functions'
import { Utxo, mockUtxos } from '../../util/mocks'

export enum UserFilter {
  birthBlock = 'birthBlock',
  followersCount = 'followersCount',
}

@Path('/users')
export class UserHandler {

	@Path('/')
	@GET
	async index (
    @HeaderParam('my-address') myAddress: string,
    @QueryParam('filter') filter: UserFilter = UserFilter.birthBlock,
    @QueryParam('page') page: string = '1',
    @QueryParam('perPage') perPage: string = '20',
  ): Promise<ApiUser[]> {

    const pageNum = Number(page)
    const perPageNum = Number(perPage)

    let options: FindManyOptions<User> = {
      take: perPageNum,
      skip: perPageNum * (pageNum - 1),
      order: { [filter]: filter === UserFilter.birthBlock ? 'ASC' : 'DESC' },
    }

    const users = await getRepository(User).find(options)

    return Promise.all(users.map(async user => {
      return {
        ...user,
        iFollow: await checkFollowing(myAddress, user.address),
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
      iFollow: await checkFollowing(myAddress, address),
    }
  }

	@Path('/:address/balance')
	@GET
	async getBalance (
    @PathParam('address') address: string,
  ): Promise<string> {

    console.log(address)
    return '100'
  }

	@Path('/:address/utxos')
	@GET
	async getUtxos (
    @PathParam('address') address: string,
  ): Promise<Utxo[]> {

    console.log(address)
    return mockUtxos
  }

	@Path('/:address/users')
	@GET
	async indexFollows (
    @HeaderParam('my-address') myAddress: string,
    @PathParam('address') address: string,
    @QueryParam('type') type: 'following' | 'followers',
    @QueryParam('page') page: string = '1',
    @QueryParam('perPage') perPage: string = '20',
  ): Promise<ApiUser[]> {

    const pageNum = Number(page)
    const perPageNum = Number(perPage)

    if (await checkBlocked(myAddress, address)) {
      throw new Errors.NotAcceptableError('blocked')
    }

    let query = await getRepository(User)
      .createQueryBuilder('users')
      .orderBy('users.name', 'ASC')
      .take(perPageNum)
      .offset(perPageNum * (pageNum - 1))

    if (type === 'following') {
      query
        .innerJoin('follows', 'follows', 'follows.followed_address = users.address')
        .where('follows.follower_address = :address', { address })
    } else {
      query
        .innerJoin('follows', 'follows', 'follows.follower_address = users.address')
        .where('follows.followed_address = :address', { address })
    }

    const users = await query.getMany()

    return Promise.all(users.map(async user => {
      return {
        ...user,
        iFollow: await checkFollowing(myAddress, user.address),
      }
    }))
  }
}

export interface ApiUser extends User {
  iFollow: boolean
}
