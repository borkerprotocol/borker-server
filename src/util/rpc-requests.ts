import * as rp from 'request-promise'
import * as config from '../../borkerconfig.json'

export interface Response {
  result: string
  error: string | null
  id: string
}

export async function getBlockHash (blockHeight: number): Promise<string> {
  if (blockHeight <= 17906) {
    return blockHeight.toString()
    // return request('getblockhash', `${blockHeight}`, [blockHeight])
  }
}

export async function getBlock (blockHash: string): Promise<string> {
  return blockHash
  // return request('getblock', `${blockHash}`, [blockHash, false])
}

// private

async function request (method: string, id: string, params: any[] = []): Promise<string> {

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
