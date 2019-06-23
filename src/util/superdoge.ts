import * as rp from 'request-promise'
import { Utxo, HostType, RequestOpts } from './types'
import { getManager } from 'typeorm'
import { Host } from '../db/entities/host'
import * as config from '../../borkerconfig.json'

export class Superdoge {
  private superdogeHost: Host | undefined
  private registryHost: Host | undefined
  private lockedTo: number = 0

  async getBlock (height: number): Promise<{ blockHash: string, blockHex: string }> {
    return this.superdogeRequest({
      method: 'GET',
      url: '/block',
      qs: { height },
    }, height)
  }

  async broadcast (txs: string[]): Promise<string[]> {
    return this.superdogeRequest({
      method: 'POST',
      url: '/transactions',
      body: txs,
    })
  }

  async getBalance (address: string): Promise<number> {
    return this.superdogeRequest({
      method: 'GET',
      url: '/balance',
      qs: { address },
    })
  }

  async getUtxos (address: string, amount: number, batchSize?: number): Promise<Utxo[]> {
    return this.superdogeRequest({
      method: 'GET',
      url: '/utxos',
      qs: { address, amount, batchSize },
    })
  }

  // private

  private async superdogeRequest (options: RequestOpts, id = Math.floor(Math.random() * 10000) + 1, count = 0): Promise<any> {
    if (this.lockedTo && this.lockedTo !== id) { throw new Error('superdoge unavailable. try again soon.') }

    this.superdogeHost = this.superdogeHost || await this.getSuperdogeHost(count)
    const url = this.superdogeHost.url

    try {
      if (count > 1) {
        console.log('SUPERDOGE trying: ' + url)
      }
      const res = await rp({ ...options, url: url + options.url })
      if (count > 1 || !this.superdogeHost.lastGraduated) {
        this.superdogeHost.lastGraduated = new Date()
        this.superdogeHost = await getManager().save(this.superdogeHost)
        this.lockedTo = 0
      }
      return res
    } catch (e) {
      console.error('SUPERDOGE request failed: ' + url)

      this.lockedTo = id
      this.superdogeHost = undefined

      await this.superdogeRequest(options, count + 1)
    }
  }

  private async registryRequest (options: RequestOpts, count = 0): Promise<any> {

    this.registryHost = this.registryHost || await this.getRegistryHost(count)
    const url = this.registryHost.url

    try {
      if (count > 1) { console.log('REGISTRY trying: ' + url) }
      return await rp({ ...options, url: url + options.url })
    } catch (e) {
      console.error('REGISTRY request failed: ' + url)

      this.registryHost = undefined

      await this.registryRequest(options, count + 1)
    }
  }

  // private

  private async getSuperdogeHost (count: number): Promise<Host> {
    // find superdoge host in DB
    let host = (await getManager().find(Host, {
      where: {
        type: HostType.superdoge,
      },
      take: 1,
      skip: count,
      order: { priority: 'DESC', lastGraduated: 'DESC' },
    }))[0]
    // discover new superdoge host if not exists
    if (!host) {
      if (!config.discover) {
        throw new Error('discover disabled. to enable superdoge discovery through the borker registry, set "discovery": true in borkerconfig.json')
      }
      const url = await this.registryRequest({
        method: 'GET',
        url: '/node/superdoge',
        qs: { page: count },
      })
      // instantiate host
      host = new Host()
      host.type = HostType.superdoge
      host.url = url
    }
    // set local variable
    return host
  }

  private async getRegistryHost (count: number): Promise<Host> {
    // find registry host in DB
    let host = (await getManager().find(Host, {
      where: {
        type: HostType.registry,
      },
      take: 1,
      skip: count,
      order: { priority: 'DESC', lastGraduated: 'DESC' },
    }))[0]

    if (!host) {
      throw new Error(`failed to discover a valid registry url. ${count} registry hosts in the DB.`)
    }

    return host
  }
}
