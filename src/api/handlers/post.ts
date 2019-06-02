import { GET, Path, PathParam, QueryParam, HeaderParam, Errors, POST } from 'typescript-rest'
import { Post } from '../../db/entities/post'
import { getRepository, getManager } from 'typeorm'
import { User } from '../../db/entities/user'
import { ApiUser } from './user'
import { checkBlocked, iFollowBlock } from '../../util/functions'
import { OrderBy } from '../../util/misc-types'
import * as rpc from '../../util/rpc-requests'
import { BorkType } from 'borker-rs-node'

@Path('/posts')
export class PostHandler {

	@Path('/')
	@GET
	async index (
    @HeaderParam('my-address') myAddress: string,
    @QueryParam('senderAddress') senderAddress?: string,
    @QueryParam('parentTxid') parentTxid?: string,
    @QueryParam('types') types?: BorkType[],
    @QueryParam('tags') tags?: string[],
    @QueryParam('order') order: OrderBy<Post> = { createdAt: 'DESC' },
    @QueryParam('filterFollowing') filterFollowing: boolean = false,
    @QueryParam('page') page: string | number = 1,
    @QueryParam('perPage') perPage: string | number = 20,
  ): Promise<ApiPost[]> {

    page = Number(page)
    perPage = Number(perPage)

    if (perPage > 40) { throw new Errors.BadRequestError('perPage limit is 40') }

    Object.keys(order).forEach(key => {
      const newkey = `posts.${key}`
      order[newkey] = order[key]
      delete order[key]
    })

    let query = getRepository(Post)
      .createQueryBuilder('posts')
      .leftJoinAndSelect('posts.sender', 'sender')
      .where('posts.sender_address NOT IN (SELECT blocked_address FROM blocks WHERE blocker_address = :myAddress)', { myAddress })
      .andWhere('posts.sender_address NOT IN (SELECT blocker_address FROM blocks WHERE blocked_address = :myAddress)', { myAddress })
      .orderBy(order)
      .take(perPage)
      .skip(perPage * (page - 1))

    if (!parentTxid) {
      query
        .leftJoinAndSelect('posts.parent', 'parent')
        .leftJoinAndSelect('parent.sender', 'parentSender')
    }
    if (types) {
      query.andWhere('posts.type IN (:...types)', { types })
    }
    if (tags) {
      query.andWhere('posts.txid IN (SELECT post_txid FROM post_tags WHERE tag_name IN (:...tags))', { tags })
    }
    if (filterFollowing) {
      query.andWhere('posts.sender_address IN (SELECT followed_address FROM follows WHERE follower_address = :myAddress)', { myAddress })
    }
    if (senderAddress) {
      query.andWhere('posts.sender_address = :senderAddress', { senderAddress })
    }
    if (parentTxid) {
      query.andWhere('posts.parent_txid = :parentTxid', { parentTxid })
    }

    const posts = await query.getMany()

    return Promise.all(posts.map(async post => {
      if (post.parent) {
        Object.assign(post.parent, { ...await this.iCommentReborkFlag(myAddress, post.parent.txid) })
      }

      const [iStuff, counts] = await Promise.all([
        this.iCommentReborkFlag(myAddress, post.txid),
        this.getCounts(post.txid),
      ])

      return {
        ...post,
        ...iStuff,
        ...counts,
      }
    }))
  }

	@Path('/broadcast')
	@POST
	async broadcast (txs: string[]): Promise<string[]> {

    return Promise.all(txs.map(rpc.broadcast))
  }

	@Path('/:txid')
	@GET
	async get (
    @HeaderParam('my-address') myAddress: string,
    @PathParam('txid') txid: string,
  ): Promise<ApiPost> {

    const post = await getRepository(Post).findOne(txid, { relations: ['sender', 'parent', 'parent.sender'] })
    if (!post) {
      throw new Errors.NotFoundError('post not found')
    }

    if (await checkBlocked(myAddress, post.sender.address)) {
      throw new Errors.NotAcceptableError('blocked')
    }

    const [iStuff, counts] = await Promise.all([
      this.iCommentReborkFlag(myAddress, post.txid),
      this.getCounts(post.txid),
    ])

    return {
      ...post,
      ...iStuff,
      ...counts,
    }
  }

	@Path('/:txid/users')
	@GET
	async indexPostUsers (
    @HeaderParam('my-address') myAddress: string,
    @PathParam('txid') txid: string,
    @QueryParam('type') type: 'reborks' | 'likes' | 'flags',
    @QueryParam('order') order: OrderBy<User> = { createdAt: 'ASC' },
    @QueryParam('page') page: string | number = 1,
    @QueryParam('perPage') perPage: string | number = 20,
  ): Promise<ApiUser[]> {

    page = Number(page)
    perPage = Number(perPage)

    if (perPage > 40) { throw new Errors.BadRequestError('perPage limit is 40') }

    Object.keys(order).forEach(key => {
      const newkey = `users.${key}`
      order[newkey] = order[key]
      delete order[key]
    })

    const users = await getRepository(User)
      .createQueryBuilder('users')
      .where(qb => {
        let subQuery: string
        switch (type) {
          case 'reborks':
            subQuery = qb.subQuery()
              .select('sender_address')
              .from(Post, 'posts')
              .where('parent_txid = :txid', { txid })
              .andWhere('type = :type', { type })
              .getQuery()
            break
          case 'likes':
            subQuery = qb.subQuery()
              .select('user_address')
              .from('likes', 'likes')
              .where('post_txid = :txid', { txid })
              .getQuery()
            break
          case 'flags':
            subQuery = qb.subQuery()
              .select('user_address')
              .from('flags', 'flags')
              .where('post_txid = :txid', { txid })
              .getQuery()
            break
          default:
            throw new Errors.BadRequestError('query param "type" must be "reborks", "likes", or "flags"')
        }
        return `address IN ${subQuery}`
      })
      .orderBy(order)
      .take(perPage)
      .offset(perPage * (page - 1))
      .getMany()

    return Promise.all(users.map(async user => {
      return {
        ...user,
        ...(await iFollowBlock(myAddress, user.address)),
      }
    }))
  }

  private async getCounts (txid: string): Promise<{
    commentsCount: number
    reborksCount: number
    likesCount: number
    flagsCount: number
  }> {

    const [ commentsCount, reborksCount, likesCount, flagsCount ] = await Promise.all([
      getRepository(Post).count({ parent: { txid }, type: BorkType.Comment, deletedAt: null }),
      getRepository(Post).count({ parent: { txid }, type: BorkType.Rebork, deletedAt: null }),
      getManager().createQueryBuilder()
        .select('likes')
        .from('likes', 'likes')
        .where('post_txid = :txid', { txid })
        .getCount(),
      getManager().createQueryBuilder()
        .select('flags')
        .from('flags', 'flags')
        .where('post_txid = :txid', { txid })
        .getCount(),
    ])

    return { commentsCount, reborksCount, likesCount, flagsCount }
  }

  private async iCommentReborkFlag (myAddress: string, txid: string): Promise<{
    iComment: boolean
    iRebork: boolean
    iLike: boolean
    iFlag: boolean
  }> {

    const [comment, rebork, like, flag] = await Promise.all([
      getRepository(Post).findOne({
        sender: { address: myAddress },
        parent: { txid },
        type: BorkType.Comment,
      }),
      getRepository(Post).findOne({
        sender: { address: myAddress },
        parent: { txid },
        type: BorkType.Rebork,
      }),
      getManager().createQueryBuilder()
        .select('likes')
        .from('likes', 'likes')
        .where('user_address = :myAddress', { myAddress })
        .andWhere('post_txid = :txid', { txid })
        .getOne(),
      getManager().createQueryBuilder()
        .select('flags')
        .from('flags', 'flags')
        .where('user_address = :myAddress', { myAddress })
        .andWhere('post_txid = :txid', { txid })
        .getOne(),
    ])

    return {
      iComment: !!comment,
      iRebork: !!rebork,
      iLike: !!like,
      iFlag: !!flag,
    }
  }
}

export interface ApiPost extends Post {
  iComment: boolean
  iRebork: boolean
  iLike: boolean
  iFlag: boolean
  commentsCount: number
  reborksCount: number
  likesCount: number
  flagsCount: number
}
