import * as rp from 'request-promise'
import { Utxo, RequestOpts } from './types'
import * as config from '../../borkerconfig.json'

const base = config.externalip || 'http://localhost:11021'

export async function getBlockHashReq (height: number): Promise<string> {
  return rpcRequest({
    method: 'POST',
    url: '/',
    body: {
      method: 'getblockhash',
      params: [height],
    },
  })
}

export async function getBlockReq (hash: string): Promise<string> {
  return rpcRequest({
    method: 'POST',
    url: '/',
    body: {
      method: 'getblock',
      params: [hash, false],
    },
  })
}

export async function broadcastReq (txs: string[]): Promise<string[]> {
  let txids: string[] = []
  for (let tx of txs) {
    txids.push(await rpcRequest({
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

export async function getBalanceReq (address: string): Promise<number> {
  return request({
    method: 'GET',
    url: '/balance',
    qs: { address },
  })
}

export async function getUtxosReq (address: string, amount: number, minimum?: number): Promise<Utxo[]> {
  return request({
    method: 'GET',
    url: '/utxos',
    qs: { address, amount, minimum },
  })
}

// private

async function rpcRequest (options: RequestOpts): Promise<any> {
  const res: {
    id: string
    result: string
    error: string | null
  } = await request(options)

  return res.result
}

async function request (options: RequestOpts): Promise<any> {
  return rp({
    ...options,
    json: true,
    url: base + options.url,
  })
}
