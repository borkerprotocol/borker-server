import { GET, Path, PathParam } from 'typescript-rest'
import { getManager } from 'typeorm'
import { Post } from '../../db/entities/post'

@Path('/posts')
export class PostHandler {
	constructor () { }

	@Path('/')
	@GET
	async index () {
		return getManager().find(Post)
	}

	@Path('/:txid')
	@GET
	async get (@PathParam('txid') txid: string) {
		return getManager().findOne(Post, { txid })
	}
}