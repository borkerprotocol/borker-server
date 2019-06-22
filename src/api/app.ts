import * as express from 'express'
import * as cors from 'cors'
import * as bodyParser from 'body-parser'
import { Server } from 'typescript-rest'
import handlers from './handlers'
import { RPD } from './handlers/status'
import * as https from 'https'
import * as config from '../../borkerconfig.json'
import * as fs from 'fs'

// express app and router
const app: express.Application = express()
const router: express.Router = express.Router()

// middleware
router.use('/', (req, res, next) => {
  // track running average of requests per day
  const now = new Date().getTime()
  const elapsed = ((now - RPD.last) / 86400000)
  RPD.count = (RPD.count + 1) / (1 + elapsed)
  RPD.last = now
  // ensure my-address header is present
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

// set up https server
if (config.cert) {
  https.createServer({
    key: fs.readFileSync(config.key),
    cert: fs.readFileSync(config.cert),
    ca: [
      fs.readFileSync(config.caRoot),
      fs.readFileSync(config.caBundle),
    ],
  }, app)
}

export default app
