import * as rp from 'request-promise'
import { Utxo, RequestOpts, rpcResponse } from './types'
import * as config from '../../borkerconfig.json'

export async function getBlockHash(height: number): Promise<string> {
  const res = await rpcRequest({
    method: 'POST',
    url: '/',
    body: {
      method: 'getblockhash',
      params: [height],
    },
  }) as rpcResponse

  return res.result!
}

export async function getBlockHashes(startingHeight: number): Promise<{ height: number, hash: string }[]> {
  let bodies: {
    method: 'getblockhash'
    id: number,
    params: number[]
  }[] = []

  for (let i = 0; i < 40; i++) {
    let height = startingHeight + i
    bodies.push({ method: 'getblockhash', id: height, params: [height] })
  }

  const res = await rpcRequest({
    method: 'POST',
    url: '/',
    body: bodies,
  }) as rpcResponse[]

  return res
    .filter(r => r.result)
    .sort((a, b) => (a.id > b.id) ? 1 : -1)
    .map(s => { return { height: s.id, hash: s.result } }) as { height: number, hash: string }[]
}

export async function getBlocks(heightHashes: { height: number, hash: string }[]): Promise<string[]> {
  const bodies = heightHashes.map(heightHash => {
    return { method: 'getblock', id: heightHash.height, params: [heightHash.hash, false] }
  })

  const res = await rpcRequest({
    method: 'POST',
    url: '/',
    body: bodies,
  }) as rpcResponse[]

  return res
    .sort((a, b) => (a.id > b.id) ? 1 : -1)
    .map(r => r.result!)
}

export async function broadcast(txs: string[]): Promise<string[]> {
  let txids: string[] = []
  for (let tx of txs) {
    const res = await rpcRequest({
      method: 'POST',
      url: '/',
      body: {
        method: 'sendrawtransaction',
        params: [tx],
      },
    }) as rpcResponse

    txids.push(res.result!)
  }

  return txids
}

// export async function getBalance(address: string): Promise<number> {
//   return request({
//     method: 'GET',
//     url: '/balance',
//     qs: { address },
//   })
// }

// export async function getUtxos(address: string, amount: number, minimum?: number): Promise<Utxo[]> {
//   return request({
//     method: 'GET',
//     url: '/utxos',
//     qs: { address, amount, minimum },
//   })
// }

// private

async function rpcRequest(options: RequestOpts): Promise<rpcResponse | rpcResponse[]> {
  return request(options)
}

async function request(options: RequestOpts): Promise<any> {
  return rp({
    ...options,
    json: true,
    url: (config.externalip || 'http://localhost:8332') + options.url,
    headers: { 'content-type': 'application/json', 'Authorization': `Basic ${btoa(`${config.rpcuser}:${config.rpcpassword}`)}` },
  })
}
