import * as express from 'express'
import * as cors from 'cors'
import * as bodyParser from 'body-parser'
import { Server } from 'typescript-rest'
import handlers from './handlers'
import { RPD } from './handlers/status'

// express app and router
const app: express.Application = express()
const router: express.Router = express.Router()

// middleware
router.use('/', (req, res, next) => {
  const now = new Date()
  const elapsed = ((new Date().getTime() - RPD.last.getTime()) / 86400000)
  RPD.count = (RPD.count + (1 / elapsed)) / (1 + elapsed)
  RPD.last = now
  if (!req.headers['my-address'] && !req.path.startsWith('/status')) {
    return res.status(403).json({ error: 'missing "my-address" header' })
  }
  next()
})
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: false }))
app.use(cors())

// api
Server.buildServices(router, ...handlers)
app.use('/', router)

Server.ignoreNextMiddlewares(true)

export default app