import { Path, GET } from 'typescript-rest'

export let RPD = {
  count: 0,
  last: new Date().getTime(),
}

@Path('status')
export class StatusHandler {

  @Path('/')
  @GET
  async getStatus (): Promise<number> {
    return RPD.count
  }
}