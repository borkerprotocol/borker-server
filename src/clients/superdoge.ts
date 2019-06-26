import * as rp from 'request-promise'
import { Utxo, RequestOpts, HostType } from '../util/types'
import { getManager } from 'typeorm'
import { Host } from '../db/entities/host'
import { Registry } from './registry'
import * as config from '../../borkerconfig.json'

export class Superdoge {
  private host: Host | undefined
  private lockedTo: number = 0

  constructor (
    public registry = new Registry()
  ) { }

  async getBlockHash (height: number): Promise<string> {
    return this.request({
      method: 'POST',
      url: '/',
      body: {
        method: 'getblockhash',
        params: [height]
      },
    })
  }

  async getBlock (hash: string): Promise<string> {
    return this.request({
      method: 'POST',
      url: '/',
      body: {
        method: 'getblock',
        params: [hash]
      },
    })
  }

  async broadcast (txs: string[]): Promise<string[]> {
    let txids: string[] = []
    for (let tx of txs) {
      txids.push(await this.request({
        method: 'POST',
        url: '/',
        body: {
          method: 'sendrawtransaction',
          params: [tx]
        },
      }))
    }
    return txids
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

  private async getHost (count: number): Promise<Host> {
    // find host in DB
    let host = (await getManager().find(Host, {
      where: {
        type: HostType.superdoge,
      },
      take: 1,
      skip: count,
      order: { priority: 'ASC', lastGraduated: 'DESC', createdAt: 'ASC' },
    }))[0]
    // discover new hosts if needed
    if (!host) {
      await this.registry.discoverHosts(HostType.superdoge, 1, count)
      host = await this.getHost(count)
    }

    return host
  }

  private async request (options: RequestOpts, id = Math.floor(Math.random() * 10000) + 1, count = 0): Promise<any> {
    if (this.lockedTo && this.lockedTo !== id) { throw new Error('Superdoge unavailable. Try again soon.') }

    this.host = this.host || await this.getHost(count)
    const url = this.host.url

    try {
      if (count > 1) {
        console.log('SUPERDOGE trying: ' + url)
      }
      const res = await rp({ ...options, url: url + options.url })
      if (count > 1 || !this.host.lastGraduated) {
        this.host.lastGraduated = new Date()
        this.host = await getManager().save(this.host)
        this.lockedTo = 0
      }
      return res
    } catch (e) {
      console.error('SUPERDOGE request failed: ' + url)

      this.lockedTo = id
      this.host = undefined

      await this.request(options, id, count + 1)
    }
  }
}
