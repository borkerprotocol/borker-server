import { GET, Path, PathParam } from 'typescript-rest'
import { getManager } from 'typeorm'
import { Post } from '../../db/entities/post'

@Path('/posts')
export class PostHandler {
	constructor () { }

	@Path('/')
	@GET
	async index (): Promise<Post[]> {
    return getManager().find(Post, { relations: ['sender', 'recipient', 'parent'] })
	}

	@Path('/:txid')
	@GET
	async get (@PathParam('txid') txid: string): Promise<Post> {
		return getManager().findOne(Post, { txid })
	}
}