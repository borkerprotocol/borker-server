import { GET, Path, PathParam } from 'typescript-rest'

@Path('/posts')
export class PostHandler {
  constructor () {}

  @Path('/')
  @GET
  async index () {
    return [{ txid: '' }]
  }

  @Path('/:txid')
  @GET
  async get (@PathParam('txid') txid: string) {
    return { txid }
  }
}