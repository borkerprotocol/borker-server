import * as rp from 'request-promise'
import { Utxo, HostType, RequestOpts } from './types'
import { getManager } from 'typeorm'
import { Host } from '../db/entities/host'
import * as config from '../../borkerconfig.json'

export class Superdoge {
  private superdogeURL: string | undefined
  private registryURL: string | undefined

  async getBlock (height: number): Promise<{ blockHash: string, blockHex: string }> {
    return this.request({
      method: 'GET',
      url: '/block',
      qs: { height },
    })
  }

  async broadcast (txs: string[]): Promise<string[]> {
    return this.request({
      method: 'POST',
      url: '/transactions',
      body: txs,
    })
  }

  async getBalance (address: string): Promise<number> {
    return this.request({
      method: 'GET',
      url: '/balance',
      qs: { address },
    })
  }

  async getUtxos (address: string, amount: number, batchSize?: number): Promise<Utxo[]> {
    return this.request({
      method: 'GET',
      url: '/utxos',
      qs: { address, amount, batchSize },
    })
  }

  // private

  private async request (options: RequestOpts, type = HostType.superdoge, count = 0): Promise<any> {
    let url = type === HostType.registry ? this.registryURL : this.superdogeURL

    // set local varibale if not set
    if (!url) {
      const setURL = type === HostType.registry ? this.setRegistryURL.bind(this) : this.setSuperdogeURL.bind(this)
      await setURL(count)
    }
    url = type === HostType.registry ? this.registryURL : this.superdogeURL

    try {
      return await rp({ ...options, url: url + options.url })
    } catch (e) {
      console.error(
        'REQUEST ERROR: ' + url +
        '\ncode: ' + e.statusCode +
        '\nmessage: ' + e.message,
      )

      if (type === HostType.registry) {
        this.registryURL = undefined
      } else {
        this.superdogeURL = undefined
      }

      await this.request(options, type, count + 1)
    }
  }

  // private

  private async setSuperdogeURL (count: number): Promise<void> {
    // find existing host
    let host = (await getManager().find(Host, {
      where: {
        type: HostType.superdoge,
      },
      take: 1,
      skip: count,
      order: { lastUsed: 'DESC' },
    }))[0]
    // discover new superdoge host if not exists
    if (!host) {
      if (!config.discover) {
        throw new Error('discover disabled')
      }
      const url = await this.request({
        method: 'GET',
        url: '/node/superdoge',
      }, HostType.registry)
      // save host
      host = new Host()
      host.type = HostType.superdoge
      host.url = url
      host.lastUsed = new Date()
      await getManager().save(host)
    }
    // set local variable
    this.superdogeURL = host.url
  }

  private async setRegistryURL (count: number): Promise<void> {
    // find existing host
    let host = (await getManager().find(Host, {
      where: {
        type: HostType.registry,
      },
      take: 1,
      skip: count,
      order: { lastUsed: 'DESC' },
    }))[0]

    if (!host) {
      throw new Error('registry host not found')
    }

    this.registryURL = host.url
  }
}
