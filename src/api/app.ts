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
let app: express.Application | https.Server = express()
const router: express.Router = express.Router()

// middleware
router.use('/', (req, res, next) => {
  // track running average of requests per day
  const now = new Date().getTime()
  const elapsed = ((now - RPD.last) / 86400000)
  RPD.count = (RPD.count + 1) / (1 + elapsed)
  RPD.last = now
  // ensure my-address header is present for non-status requests
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
let ssl = config.ssl
if (ssl.cert) {
  app = https.createServer({
    cert: fs.readFileSync(ssl.cert),
    key: fs.readFileSync(ssl.privkey),
    ca: [
      fs.readFileSync(ssl.chain),
      fs.readFileSync(ssl.fullchain),
    ],
  }, app)
}

export default app
