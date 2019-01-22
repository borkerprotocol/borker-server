import * as rp from 'request-promise'
import { TransactionType } from '../db/entities/transaction'
import { mockBlocks, mockTxs } from './mocks'
import * as config from '../../borker-config.json'

export interface Block {
  hash: string
  height: number
  transactions: string[]
}

export interface MappedTx {
  timestamp: number
  txid: string
  type: TransactionType
  nonce: number
  referenceNonce: number | null
  content: string | null
  value: string | null
  fee: string
  senderAddress: string
  recipientAddress: string | null
}

export async function getBlock (blockHash: string): Promise<Block> {
  // return request('getblock', `${blockHash}`, { blockHash })
  return mockBlocks.find(b => b.hash === blockHash)
}

export async function getBlockHash (blockHeight: number): Promise<string> {
  // return request('getBlockHash', `${blockHeight}`, { blockHeight })
  if (blockHeight <= 2444901) {
    return mockBlocks.find(b => b.height === blockHeight).hash
  }
}

// TODO delete once borkerLib implemented
export async function getTxHash (txid: string): Promise<string> {
  return txid
}

// TODO delete once borkerLib implemented
export async function getTx (txHash: string): Promise<MappedTx> {
  return mockTxs.find(t => t.txid === txHash)
}

export async function getNetworkInfo () {
	const options: rp.Options = {
		method: 'GET',
		url: 'https://chain.so/api/v2/get_info/DOGE',
	}

	return rp(options)
}

// private

async function request (method: string, id: string, params: {}): Promise<any> {

	const options: rp.Options = {
		method: 'POST',
		url: `https://${ config.externalip }`,
		auth: {
			user: config.rpcusername,
			password: config.rpcpassword,
		},
		body: JSON.stringify({
			jsonrpc: '2.0',
			method,
			id,
			params,
		}),
	}

	return rp(options)
}