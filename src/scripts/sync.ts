import * as rpc from '../util/rpc-requests'

async function syncChain () {
	try {
		console.log('begin sync')
		const currentBlock = await rpc.getNetworkInfo()
		console.log('network info: ', currentBlock)
	}
	catch (err) {
		console.error(err)
	}
}

export default syncChain