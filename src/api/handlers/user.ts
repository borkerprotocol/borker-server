import { GET, Path, PathParam, QueryParam, HeaderParam, Errors } from 'typescript-rest'
import { getRepository, FindManyOptions } from 'typeorm'
import { User } from '../../db/entities/user'
import { checkFollowing, checkBlocked } from '../../util/functions'

export enum UserFilter {
  birthBlock = 'birthBlock',
  earnings = 'earnings',
  followersCount = 'followersCount',
}

@Path('/users')
export class UserHandler {

	@Path('/')
	@GET
	async index (
    @HeaderParam('myAddress') myAddress: string,
    @QueryParam('filter') filter: UserFilter = UserFilter.birthBlock,
    @QueryParam('page') page: number = 1,
    @QueryParam('perPage') perPage: number = 20,
  ): Promise<ApiUser[]> {

    let options: FindManyOptions<User> = {
      take: perPage,
      skip: perPage * (page - 1),
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
    @HeaderParam('myAddress') myAddress: string,
    @PathParam('address') address: string,
  ): Promise<ApiUser> {

    if (await checkBlocked(myAddress, address)) {
      throw new Errors.NotAcceptableError('blocked')
    }
    
    const user = await getRepository(User).findOneOrFail(address)

    return {
      ...user,
      iFollow: await checkFollowing(myAddress, address),
    }
  }

	@Path('/:address/users')
	@GET
	async indexFollows (
    @HeaderParam('myAddress') myAddress: string,
    @PathParam('address') address: string,
    @QueryParam('type') type: 'following' | 'followers',
    @QueryParam('page') page: number = 1,
    @QueryParam('perPage') perPage: number = 20,
  ): Promise<ApiUser[]> {

    if (await checkBlocked(myAddress, address)) {
      throw new Errors.NotAcceptableError('blocked')
    }

    let query = await getRepository(User)
      .createQueryBuilder('users')
      .orderBy('users.name', 'ASC')
      .limit(perPage)
      .offset(perPage * (page - 1))

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
