import { GET, Path, PathParam, QueryParam, HeaderParam, Errors, POST } from 'typescript-rest'
import { Post, PostType } from '../../db/entities/post'
import { getRepository, getManager } from 'typeorm'
import { User } from '../../db/entities/user'
import { ApiUser } from './user'
import { checkBlocked, iFollowBlock } from '../../util/functions'
import { OrderBy } from '../../util/misc-types'
import * as rpc from '../../util/rpc-requests'

@Path('/posts')
export class PostHandler {

	@Path('/')
	@GET
	async index (
    @HeaderParam('my-address') myAddress: string,
    @QueryParam('senderAddress') senderAddress?: string,
    @QueryParam('parentTxid') parentTxid?: string,
    @QueryParam('types') types?: PostType[],
    @QueryParam('tags') tags?: string[],
    @QueryParam('order') order: OrderBy<Post> = { createdAt: 'DESC' },
    @QueryParam('filterFollowing') filterFollowing: boolean = false,
    @QueryParam('page') page: string | number = 1,
    @QueryParam('perPage') perPage: string | number = 20,
  ): Promise<ApiPost[]> {

    page = Number(page)
    perPage = Number(perPage)

    Object.keys(order).forEach(key => {
      const newkey = `tx.${key}`
      order[newkey] = order[key]
      delete order[key]
    })

    let query = getRepository(Post)
      .createQueryBuilder('post')
      .leftJoinAndSelect('post.sender', 'sender')
      .where('post.sender_address NOT IN (SELECT blocked_address FROM blocks WHERE blocker_address = :myAddress)', { myAddress })
      .andWhere('post.sender_address NOT IN (SELECT blocker_address FROM blocks WHERE blocked_address = :myAddress)', { myAddress })
      .orderBy(order)
      .take(perPage)
      .skip(perPage * (page - 1))

    if (!parentTxid) {
      query
        .leftJoinAndSelect('post.parent', 'parent')
        .leftJoinAndSelect('parent.sender', 'parentSender')
    }
    if (types) {
      query.andWhere('post.type IN (:...types)', { types })
    }
    if (tags) {
      query.andWhere('post.txid IN (SELECT post_txid FROM tags WHERE tag_name IN (:...tags))', { tags })
    }
    if (filterFollowing) {
      query.andWhere('post.sender_address IN (SELECT followed_address FROM follows WHERE follower_address = :myAddress)', { myAddress })
    }
    if (senderAddress) {
      query.andWhere('post.sender_address = :senderAddress', { senderAddress })
    }
    if (parentTxid) {
      query.andWhere('post.parent_txid = :parentTxid', { parentTxid })
    }

    const posts = await query.getMany()

    return Promise.all(posts.map(async post => {
      if (post.parent) {
        Object.assign(post.parent, { ...await this.iCommentLikeFlag(myAddress, post.parent.txid) })
      }
      return {
        ...post,
        ...(await this.iCommentLikeFlag(myAddress, post.txid)),
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
  ): Promise<ApiPostExtended> {

    const post = await getRepository(Post).findOne(txid, { relations: ['sender', 'parent', 'parent.sender'] })
    if (!post) {
      throw new Errors.NotFoundError('post not found')
    }

    if (await checkBlocked(myAddress, post.sender.address)) {
      throw new Errors.NotAcceptableError('blocked')
    }

    // TODO fix this...just hideous
    const extensions: Post[] = []
    await this.getExtensions(post, extensions)

    return {
      ...post,
      ...(await this.iCommentLikeFlag(myAddress, post.txid)),
      extensions,
    }
  }

	@Path('/:txid/users')
	@GET
	async indexPostUsers (
    @HeaderParam('my-address') myAddress: string,
    @PathParam('txid') txid: string,
    @QueryParam('type') type: 'likes' | 'flags',
    @QueryParam('order') order: OrderBy<User> = { createdAt: 'ASC' },
    @QueryParam('page') page: string | number = 1,
    @QueryParam('perPage') perPage: string | number = 20,
  ): Promise<ApiUser[]> {

    if (!type || !['likes', 'flags'].includes(type)) {
      throw new Errors.BadRequestError('query param "type" must be "likes" or "flags"')
    }

    page = Number(page)
    perPage = Number(perPage)

    Object.keys(order).forEach(key => {
      const newkey = `users.${key}`
      order[newkey] = order[key]
      delete order[key]
    })

    const users = await getRepository(User)
      .createQueryBuilder('users')
      .where(qb => {
        let subQuery: string
        if (type === 'likes') {
          subQuery = qb.subQuery()
            .select('sender_address')
            .from(Post, 'posts')
            .where('parent_txid = :txid', { txid })
            .andWhere('type = :type', { type })
            .getQuery()
        } else {
          subQuery = qb.subQuery()
            .select('user_address')
            .from('flags', 'flags')
            .where('post_txid = :txid', { txid })
            .getQuery()
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

  private async getExtensions (post: Post, extensions: Post[]): Promise<Post[]> {
    // get the next extension
    const ext = await getRepository(Post)
      .findOne({
        parent: post,
        type: PostType.extension,
      }, {
        relations: ['sender'],
      })

    // if no more extensions, return
    if (!ext) { return }
    // add it to the list, along with the current tx as it's parent
    extensions.push({
      ...ext,
      parent: post,
    })
    // do it again
    await this.getExtensions(ext, extensions)
  }

  private async iCommentLikeFlag (myAddress: string, txid: string): Promise<{
    iComment: boolean
    iLike: boolean
    iFlag: boolean
  }> {

    const [comment, like, flag] = await Promise.all([
      getRepository(Post).findOne({
        sender: { address: myAddress },
        parent: { txid },
        type: PostType.comment,
      }),
      getRepository(Post).findOne({
        sender: { address: myAddress },
        parent: { txid },
        type: PostType.like,
      }),
      getManager()
        .createQueryBuilder()
        .select()
        .from('flags', 'flags')
        .where('user_address = :myAddress', { myAddress })
        .andWhere('post_txid = :txid', { txid })
        .getCount(),
    ])

    return {
      iComment: !!comment,
      iLike: !!like,
      iFlag: !!flag,
    }
  }
}

export interface ApiPost extends Post {
  iComment: boolean
  iLike: boolean
  iFlag: boolean
}

export interface ApiPostExtended extends ApiPost {
  extensions: Post[]
}
