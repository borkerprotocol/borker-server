import * as rp from 'request-promise'
import { Utxo, RequestOpts } from './types'
import { getManager } from 'typeorm'
import { Host } from '../db/entities/host'

export class Superdoge {
  private locked = false
  private host: Host | undefined

  async getBlockHash (height: number): Promise<string> {
    return this.rpcRequest({
      method: 'POST',
      url: '/',
      body: {
        method: 'getblockhash',
        params: [height]
      },
    })
  }

  async getBlock (hash: string): Promise<string> {
    return this.rpcRequest({
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
      txids.push(await this.rpcRequest({
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

  async getUtxos (address: string, amount: number, minimum?: number): Promise<Utxo[]> {
    return this.request({
      method: 'GET',
      url: '/utxos',
      qs: { address, amount, minimum },
    })
  }

  // private

  private async getHost (): Promise<Host> {
    // find host in DB
    let query = getManager().createQueryBuilder()
      .select('hosts')
      .from(Host, 'hosts')
      .orderBy({ last_graduated: 'DESC' })

    if (this.host) {
      query
        .andWhere('last_graduated < :time OR last_graduated IS NULL', { time: this.host.lastGraduated })
        .andWhere('priority <> :priority', { priority: 0 })
    }
    let host = await query.getOne()

    if (!host) {
      throw new Error('Superdoge hosts exhausted')
    }

    return host
  }

  private async rpcRequest (options: RequestOpts): Promise<any> {
    const res: {
      id: string
      result: string
      error: string | null
    } = await this.request(options)

    console.log(res)

    return res.result
  }

  private async request (options: RequestOpts, retry = false): Promise<any> {
    if (this.locked && !retry) { throw new Error('Borker Server temporarily unavailable') }

    if (!this.host || retry) {
      this.host = await this.getHost()
    }
    const url = this.host.url

    try {
      if (retry) { console.log('Trying: ' + url) }

      const res = await rp({
        ...options,
        json: true,
        url
      })

      // set lastGraduated if never been used or subbing in
      if (!this.host.lastGraduated || retry) {
        this.host.lastGraduated = new Date()
        this.host = await getManager().save(this.host)
        this.locked = false
      }

      return res
    } catch (e) {
      console.error('Request failed: ' + url)

      await this.request(options, true)
    }
  }
}
