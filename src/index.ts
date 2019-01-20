import "reflect-metadata"
import { createConnection } from "typeorm"
import app from './api/app'
import { syncChain } from "./scripts/sync"

// create connection and initialize app
const PORT = process.env.PORT || 3000

createConnection()
	.then(() => {
		app.listen(PORT, () => {
      console.log(`borkerd listening on port ${ PORT }`)
      syncChain()
		})
	})
	.catch(err => console.log(err))
