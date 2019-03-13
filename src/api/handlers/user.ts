import { GET, Path, PathParam, QueryParam, HeaderParam, Errors } from 'typescript-rest'
import { getRepository, FindManyOptions } from 'typeorm'
import { User } from '../../db/entities/user'
import { checkBlocked, iFollowBlock } from '../../util/functions'
import { OrderBy } from '../../util/misc-types'

@Path('/users')
export class UserHandler {

	@Path('/')
	@GET
	async index (
    @HeaderParam('my-address') myAddress: string,
    @QueryParam('order') order: OrderBy<User> = { birthBlock: 'ASC' },
    @QueryParam('page') page: string = '1',
    @QueryParam('perPage') perPage: string = '20',
  ): Promise<ApiUser[]> {

    const pageNum = Number(page)
    const perPageNum = Number(perPage)

    let options: FindManyOptions<User> = {
      take: perPageNum,
      skip: perPageNum * (pageNum - 1),
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
  ): Promise<string> {

    console.log(address)
    return '100'
  }

	@Path('/:address/users')
	@GET
	async indexFollows (
    @HeaderParam('my-address') myAddress: string,
    @PathParam('address') address: string,
    @QueryParam('type') type: 'following' | 'followers',
    @QueryParam('order') order: OrderBy<User> = { createdAt: 'ASC' },
    @QueryParam('page') page: string = '1',
    @QueryParam('perPage') perPage: string = '20',
  ): Promise<ApiUser[]> {

    if (await checkBlocked(myAddress, address)) {
      throw new Errors.NotAcceptableError('blocked')
    }

    const pageNum = Number(page)
    const perPageNum = Number(perPage)

    Object.keys(order).forEach(key => {
      const newkey = `users.${key}`
      order[newkey] = order[key]
      delete order[key]
    })

    let query = getRepository(User)
      .createQueryBuilder('users')
      .orderBy(order)
      .take(perPageNum)
      .offset(perPageNum * (pageNum - 1))

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
