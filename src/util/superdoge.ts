import * as rp from 'request-promise'
import { Utxo, RequestOpts } from './types'
import { getManager } from 'typeorm'
import { Host } from '../db/entities/host'

export class Superdoge {
  private static locked = false
  private static host: Host | undefined

  async getBlockHash (height: number): Promise<string> {
    return this.rpcRequest({
      method: 'POST',
      url: '/',
      body: {
        method: 'getblockhash',
        params: [height],
      },
    })
  }

  async getBlock (hash: string): Promise<string> {
    return this.rpcRequest({
      method: 'POST',
      url: '/',
      body: {
        method: 'getblock',
        params: [hash, false],
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
          params: [tx],
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
      .orderBy({ priority: 'ASC', last_graduated: 'DESC' })

    // if host skip union of localhost and host
    if (Superdoge.host) {
      query
        .andWhere('last_graduated < :time OR last_graduated IS NULL', { time: Superdoge.host.lastGraduated })
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

    return res.result
  }

  private async request (options: RequestOpts, retry = false): Promise<any> {
    if (Superdoge.locked && !retry) { throw new Error('Borker Server temporarily unavailable') }

    if (!Superdoge.host || retry) {
      Superdoge.host = await this.getHost()
    }

    try {
      if (retry) { console.log(`Trying: ${Superdoge.host.url}`) }

      const res = await rp({
        ...options,
        json: true,
        url: `${Superdoge.host.url}${options.url}`,
      })

      // set lastGraduated if first time used or subbing in
      if (!Superdoge.host.lastGraduated || retry) {
        Superdoge.host.lastGraduated = new Date()
        Superdoge.host = await getManager().save(Superdoge.host)

        Superdoge.locked = false
      }

      return res
    } catch (e) {
      console.error(`Request failed: ${Superdoge.host.url}`)

      await this.request(options, true)
    }
  }
}
