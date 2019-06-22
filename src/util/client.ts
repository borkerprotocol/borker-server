import * as rp from 'request-promise'
import * as config from '../../borkerconfig.json'
import { Utxo } from '../db/entities/utxo.js'

export class Client {

  async getBlockHash (height: number): Promise<string> {
    // return blockHeight.toString()

    return this.rpcRequest('getblockhash', `${height}`, [height])
  }

  // async getBlock (height: number): Promise<{ hash: string, block: string }> {
  //   return this.httpRequest({
  //     method: 'GET',
  //     url: '/block',
  //     qs: { height },
  //   })
  // }

  async getBlock (hash: string): Promise<string> {
    // return blockHash

    // return this.httpRequest({
    //   method: 'GET',
    //   url: '/block',
    //   qs: { hash },
    // })

    return this.rpcRequest('getblock', `${hash}`, [hash, false])
  }

  async broadcast (txs: string[]): Promise<string[]> {
    // return txHex

    // return this.httpRequest({
    //   method: 'POST',
    //   url: '/transactions',
    //   body: txs,
    // })

    let txids: string[] = []
    for (let tx of txs) {
      txids.push(await this.rpcRequest('sendrawtransaction', `${tx}`, [tx]))
    }
    return txids
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

  private async rpcRequest (method: string, id: string, params: any[] = []): Promise<string> {

    const raw: string = await rp.post(`http://${config.externalip}:22555`, {
      auth: {
        user: config.rpcuser,
        pass: config.rpcpassword,
        sendImmediately: false,
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method,
        id,
        params,
      }),
    })

    const res: Response = JSON.parse(raw)
    return res.result
  }

  private async httpRequest (options: rp.OptionsWithUrl): Promise<any> {

    Object.assign(options, {
      json: true,
      url: config.externalip + options.url,
    })

    try {
      return rp(options)
    } catch (err) {
      console.error(err)
    }
  }
}

export interface Response {
  result: string
  error: string | null
  id: string
}
