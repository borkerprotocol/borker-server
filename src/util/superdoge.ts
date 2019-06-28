import * as rp from 'request-promise'
import { Utxo, RequestOpts } from './types'
import { getManager } from 'typeorm'
import * as config from '../../borkerconfig.json'

export class Superdoge {

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

  private async rpcRequest (options: RequestOpts): Promise<any> {
    const res: {
      id: string
      result: string
      error: string | null
    } = await this.request(options)

    return res.result
  }

  private async request (options: RequestOpts): Promise<any> {
    return rp({
      ...options,
      json: true,
      url: config.superdogeip || 'http://localhost:11021',
    })
  }
}
