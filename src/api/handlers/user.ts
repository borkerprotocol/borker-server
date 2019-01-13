import { GET, Path, PathParam } from 'typescript-rest'
import { getManager } from 'typeorm'
import { User } from '../../db/entities/user'

@Path('/users')
export class UserHandler {
	constructor () { }

	@Path('/')
	@GET
	async index () {
		return getManager().find(User)
	}

	@Path('/:address')
	@GET
	async get (@PathParam('address') address: string) {
		return getManager().findOne(User, { address })
	}
}