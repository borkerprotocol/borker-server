import * as rp from 'request-promise'
import * as config from '../../borkerconfig.json'

export class Client {

  constructor () {}

  // RPC REQUESTS

  async getBlockHash (blockHeight: number): Promise<string> {
    // return blockHeight.toString()
    return this.rpcRequest('getblockhash', `${blockHeight}`, [blockHeight])
  }

  async getBlock (blockHash: string): Promise<string> {
    // return blockHash
    return this.rpcRequest('getblock', `${blockHash}`, [blockHash, false])
  }

  async broadcast (txHex: string): Promise<string> {
    // return txHex
    return this.rpcRequest('sendrawtransaction', `${txHex}`, [txHex])
  }

  // HTTP REQUESTS

  async getBalance (address: string): Promise<number> {
    return this.httpRequest('GET', '/balance', { address })
  }

  async getUtxos (address: string, amount: number, batchSize?: number): Promise<number> {
    return this.httpRequest('GET', '/utxos', { address, amount, batchSize })
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

  private async httpRequest (method: string, url: string, params?: object): Promise<any> {

    try {
      return await rp({
        method,
        uri: `${config.externalip}/${url}`,
        json: true,
        qs: params,
      })
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
