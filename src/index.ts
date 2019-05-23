import 'reflect-metadata'
import { createConnection } from 'typeorm'
import app from './api/app'
import { syncChain } from './scripts/sync'

// create connection and initialize app
const PORT = process.env.PORT || 4422

createConnection()
	.then(() => {
		app.listen(PORT, () => {
      console.log(`borker listening on port ${ PORT }`)
      syncChain()
		})
	})
	.catch(err => console.log(err))
