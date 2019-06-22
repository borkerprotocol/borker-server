import * as rp from 'request-promise'
import * as config from '../../borkerconfig.json'
import { Utxo } from './types.js'

export class Client {

  async getBlock (height: number): Promise<{ blockHash: string, blockHex: string }> {
    return this.httpRequest({
      method: 'GET',
      url: '/block',
      qs: { height },
    })
  }

  async broadcast (txs: string[]): Promise<string[]> {
    return this.httpRequest({
      method: 'POST',
      url: '/transactions',
      body: txs,
    })
  }

  async getBalance (address: string): Promise<number> {
    return this.httpRequest({
      method: 'GET',
      url: '/balance',
      qs: { address },
    })
  }

  async getUtxos (address: string, amount: number, batchSize?: number): Promise<Utxo[]> {
    return this.httpRequest({
      method: 'GET',
      url: '/utxos',
      qs: { address, amount, batchSize },
    })
  }

  // private

  private async httpRequest (options: rp.OptionsWithUrl): Promise<any> {

    Object.assign(options, {
      json: true,
      url: config.host + options.url,
    })

    try {
      return rp(options)
    } catch (err) {
      console.error(err)
    }
  }
}
