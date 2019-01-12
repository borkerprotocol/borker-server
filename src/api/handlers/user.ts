import { GET, Path, PathParam } from 'typescript-rest'

@Path('/users')
export class UserHandler {
  constructor () {}

  @Path('/')
  @GET
  async index () {
    return [{ address: '' }]
  }

  @Path('/:address')
  @GET
  async get (@PathParam('address') address: string) {
    return { address }
  }
}