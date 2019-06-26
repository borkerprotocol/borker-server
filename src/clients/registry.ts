import * as rp from 'request-promise'
import { HostType, RequestOpts } from '../util/types'
import { getManager } from 'typeorm'
import { Host } from '../db/entities/host'
import * as config from '../../borkerconfig.json'

export class Registry {
  private host: Host | undefined

  async register (port: number, domain: string): Promise<void> {
    return this.request({
      method: 'POST',
      url: '/register/borker',
      body: { port, domain },
    })
  }

  async discoverHosts (type: HostType, limit: number, offset: number): Promise<void> {
    if (!config.discover) {
      throw new Error('Discover disabled. To enable superdoge discovery through the borker registry, set "discovery": true in borkerconfig.json')
    }

    const urls: string[] = await this.request({
      method: 'GET',
      url: `/node/${type}`,
      qs: { limit, offset },
    })

    if (!urls.length) {
      // @TODO find more registries in this case and only throw error if those are gone
      throw new Error(`Registry tapped out`)
    }

    let hosts: Partial<Host>[] = []
    urls.forEach(url => {
      hosts.push({
        type: HostType.superdoge,
        url,
        priority: 2,
      })
    })

    await getManager().createQueryBuilder()
      .insert()
      .into(Host)
      .values(hosts)
      .onConflict('(url) DO NOTHING')
      .execute()
  }

  // private

  private async getHost (count: number): Promise<Host> {
    // find host in DB
    let host = (await getManager().find(Host, {
      where: {
        type: HostType.registry,
      },
      take: 1,
      skip: count,
      order: { priority: 'ASC', lastGraduated: 'DESC', createdAt: 'ASC' },
    }))[0]

    // discover new hosts if needed
    if (!host) {
      await this.discoverHosts(HostType.superdoge, 1, count)
      host = await this.getHost(count)
    }

    return host
  }

  private async request (options: RequestOpts, count = 0): Promise<any> {

    this.host = this.host || await this.getHost(count)
    const url = this.host.url

    try {
      if (count > 1) { console.log('REGISTRY trying: ' + url) }
      return await rp({ ...options, url: url + options.url })
    } catch (e) {
      console.error('REGISTRY request failed: ' + url)

      this.host = undefined

      await this.request(options, count + 1)
    }
  }
}
