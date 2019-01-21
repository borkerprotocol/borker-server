import * as express from 'express'
import * as cors from 'cors'
import * as bodyParser from 'body-parser'
import { Server } from 'typescript-rest'
import handlers from './handlers'

// express app and router
const app: express.Application = express()
const router: express.Router = express.Router()

// api
Server.buildServices(router, ...handlers)

// middleware
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: false }))
app.use(cors())
app.use('/', router)

export default app