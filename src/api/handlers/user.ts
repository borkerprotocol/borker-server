import { GET, Path, PathParam, QueryParam, HeaderParam } from 'typescript-rest'
import { getRepository } from 'typeorm'
import { User } from '../../db/entities/user'
import { iFollow } from '../../util/functions'

@Path('/users')
export class UserHandler {

	@Path('/')
	@GET
	async index (
    @HeaderParam('myAddress') myAddress: string,
    @QueryParam('page') page: number = 1,
    @QueryParam('perPage') perPage: number = 20,
  ): Promise<ApiUser[]> {
    const users = await getRepository(User).find({
      take: perPage,
      skip: perPage * (page - 1),
      order: { createdAt: 'ASC' },
    })

    return Promise.all(users.map(async user => {
      return {
        ...user,
        iFollow: await iFollow(myAddress, user.address),
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
      iFollow: await iFollow(myAddress, address),
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
        iFollow: await iFollow(myAddress, user.address),
      }
    }))
  }
}

export interface ApiUser extends User {
  iFollow: boolean
}
