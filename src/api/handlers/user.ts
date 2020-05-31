import { GET, Path, PathParam, QueryParam, HeaderParam, Errors } from 'typescript-rest'
import { getRepository, FindManyOptions, Like, getManager } from 'typeorm'
import { User } from '../../db/entities/user'
import { checkBlocked, iFollowBlock } from '../../util/functions'
import { OrderBy, ApiUser, Utxo } from '../../util/types'
import { Bork } from '../../db/entities/bork'
import { BorkType } from 'borker-rs-node'
import * as superdoge from '../../util/superdoge'

@Path('/users')
export class UserHandler {

  @Path('/')
  @GET
  async index(
    @HeaderParam('my-address') myAddress: string,
    @QueryParam('name') name?: string,
    @QueryParam('order') order: OrderBy<User> = { birthBlock: 'ASC' },
    @QueryParam('page') page: number = 1,
    @QueryParam('perPage') perPage: number = 20,
  ): Promise<ApiUser[]> {

    let options: FindManyOptions<User> = {
      take: perPage,
      skip: perPage * (page - 1),
      order,
    }
    if (name) {
      options.where = ({ name: Like(`%${name.split('').map(n => `${n}%`).join('')}`) })
    }
    const users = await getRepository(User).find(options)

    return Promise.all(users.map(async user => {
      return {
        ...user,
        ...await iFollowBlock(myAddress, user.address),
      }
    }))
  }

  @Path('/:address')
  @GET
  async get(
    @HeaderParam('my-address') myAddress: string,
    @PathParam('address') address: string,
  ): Promise<ApiUser> {

    let [user, blocked, counts, iStuff] = await Promise.all([
      getRepository(User).findOne(address),
      checkBlocked(myAddress, address),
      this.getCounts(address),
      iFollowBlock(myAddress, address),
    ])

    if (!user) {
      user = new User()
      user.address = address
      user.name = address.substr(0, 9)
    }
    if (blocked) {
      throw new Errors.NotAcceptableError('blocked')
    }

    return {
      ...user,
      ...counts,
      ...iStuff!,
    }
  }

  // @Path('/:address/balance')
  // @GET
  // async getBalance (@PathParam('address') address: string): Promise<number> {
  //   return superdoge.getBalance(address)
  // }

  // @Path('/:address/utxos')
  // @GET
  // async getUtxos (
  //   @PathParam('address') address: string,
  //   @QueryParam('amount') amount: number,
  //   @QueryParam('minimum') minimum: number = 100,
  // ): Promise<Utxo[]> {
  //   return superdoge.getUtxos(address, amount, minimum)
  // }

  @Path('/:address/users')
  @GET
  async indexFollows(
    @HeaderParam('my-address') myAddress: string,
    @PathParam('address') address: string,
    @QueryParam('type') type: 'following' | 'followers',
    @QueryParam('order') order: OrderBy<User> = { createdAt: 'ASC' },
    @QueryParam('page') page: number = 1,
    @QueryParam('perPage') perPage: number = 20,
  ): Promise<ApiUser[]> {

    Object.keys(order).forEach(key => {
      const newkey = `users.${key}`
      order[newkey] = order[key]
      delete order[key]
    })

    let query = getRepository(User)
      .createQueryBuilder('users')
      .where(qb => {
        let subquery = qb.subQuery()
          .from(Bork, 'borks')
          .where('type = :type', { type: BorkType.Follow })

        if (type === 'following') {
          subquery.select('recipient_address')
          subquery.andWhere('sender_address = :address')
        } else if (type === 'followers') {
          subquery.select('sender_address')
          subquery.andWhere('recipient_address = :address')
        } else {
          throw new Errors.BadRequestError('query param "type" must be "following" or "followers"')
        }

        return `address IN ${subquery.getQuery()}`
      })
      .orderBy(order as any)
      .take(perPage)
      .offset(perPage * (page - 1))
      .setParameter('address', address)

    const [blocked, users] = await Promise.all([
      checkBlocked(myAddress, address),
      query.getMany(),
    ])

    if (blocked) {
      throw new Errors.NotAcceptableError('blocked')
    }

    return Promise.all(users!.map(async user => {
      return {
        ...user,
        ...await iFollowBlock(myAddress, user.address),
      }
    }))
  }

  private async getCounts(address: string): Promise<{
    followersCount: number
    followingCount: number
  }> {

    const subquery = 'SELECT COUNT(*) as count FROM (SELECT DISTINCT sender_address, recipient_address FROM borks WHERE type = $1'

    const [followersQuery, followingQuery] = await Promise.all([
      getManager().query(subquery + ' AND recipient_address = $2)', [BorkType.Follow, address]),
      getManager().query(subquery + ' AND sender_address = $2)', [BorkType.Follow, address]),
    ])

    return {
      followersCount: followersQuery[0].count,
      followingCount: followingQuery[0].count,
    }
  }
}
