import { GET, Path, PathParam, QueryParam, HeaderParam } from 'typescript-rest'
import { getRepository, FindManyOptions } from 'typeorm'
import { User } from '../../db/entities/user'
import { checkFollowing } from '../../util/functions'

export enum UserFilter {
  birth = 'birth',
  earnings = 'earnings',
  followers = 'followers',
}

@Path('/users')
export class UserHandler {

	@Path('/')
	@GET
	async index (
    @HeaderParam('myAddress') myAddress: string,
    @QueryParam('filter') filter: UserFilter = UserFilter.birth,
    @QueryParam('page') page: number = 1,
    @QueryParam('perPage') perPage: number = 20,
  ): Promise<ApiUser[]> {

    let options: FindManyOptions<User> = {
      take: perPage,
      skip: perPage * (page - 1),
    }

    switch (filter) {
      case UserFilter.birth:
        options.order = { birthBlock: 'ASC' }
        break
      case UserFilter.earnings:
        options.order = { earnings: 'DESC' }
        break
      case UserFilter.followers:
        options.order = { followersCount: 'DESC' }
        break
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
    
    const user = await getRepository(User).findOne(address)

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

    let users: User[] = []

    const query = await getRepository(User).createQueryBuilder('users')
    if (type === 'following') {
      users = await query
        .innerJoin('follows', 'follows', 'follows.followed_address = users.address')
        .where('follows.follower_address = :address', { address })
        .orderBy('users.name', 'ASC')
        .limit(perPage)
        .offset(perPage * (page - 1))
        .getMany()
    } else {
      users = await query
        .innerJoin('follows', 'follows', 'follows.follower_address = users.address')
        .where('follows.followed_address = :address', { address })
        .orderBy('users.name', 'ASC')
        .limit(perPage)
        .offset(perPage * (page - 1))
        .getMany()
    }

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
