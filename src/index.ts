import 'reflect-metadata'
import { createConnection, getManager } from 'typeorm'
import app from './api/app'
import * as config from '../borkerconfig.json'
import { Main } from './main'
import { Host } from './db/entities/host'
import { HostType } from './util/types'

const PORT = process.env.PORT || 4422

async function startServer () {
  await createConnection()
  await app.listen(PORT)
  await upsertHosts()
  console.log(`borker server listening on port ${PORT}`)
  new Main().sync()
}

async function upsertHosts () {
  const now = new Date()
  if (config.registryURL) {
    const host = new Host()
    host.type = HostType.registry
    host.url = config.registryURL
    host.lastUsed = now
    await getManager().save(host)
  }
  if (config.superdogeURL) {
    const host = new Host()
    host.type = HostType.superdoge
    host.url = config.superdogeURL
    host.lastUsed = now
    await getManager().save(host)
  }
}

startServer()