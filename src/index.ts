import 'reflect-metadata'
import { createConnection } from 'typeorm'
import app from './api/app'
import { Main } from './main'

// create connection and initialize app
const PORT = process.env.PORT || 4422
const main = new Main()

createConnection()
	.then(() => {
		app.listen(PORT, () => {
			console.log(`borker listening on port ${PORT}`)
			main.sync()
		})
	})
	.catch(err => console.log(err))
