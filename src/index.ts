import 'reflect-metadata'
import { createConnection } from 'typeorm'
import app from './api/app'
import { Main } from './main'

// create connection and initialize app
const PORT = process.env.PORT || 4422
const main = new Main()

createConnection()
	.then(() => {
		let a = app
		const cfg = require('../borkerconfig.json')
		if (cfg.cert && cfg.key) {
			const https = require('https')
			const fs = require('fs')
			a = https.createServer({
				key: fs.readFileSync(cfg.key),
				cert: fs.readFileSync(cfg.cert),
			}, app)
		}
		a.listen(PORT, () => {
			console.log(`borker listening on port ${PORT}`)
			main.sync()
		})
	})
	.catch(err => console.log(err))
