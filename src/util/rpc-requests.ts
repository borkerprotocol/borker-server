import * as rp from 'request-promise'
import { config } from '../config/config'

export async function getBestBlockHash (): Promise<string> {
	return request('getbestblockhash', '1', {})
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