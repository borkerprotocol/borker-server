import 'reflect-metadata'
import { createConnection, getManager } from 'typeorm'
import app from './api/app'
import * as config from '../borkerconfig.json'
import { Main } from './main'
import { Host } from './db/entities/host'
import { HostType } from './util/types'
import { Superdoge } from './util/superdoge'

const PORT = process.env.PORT || '11020'

async function startServer () {
  await createConnection()
  await app.listen(PORT)
  await upsertHosts()
  if (config.register) { await registerNode() }
  console.log(`Borker Server listening on port ${PORT}`)
  new Main().sync()
}

async function registerNode (): Promise<void> {
  await new Superdoge().registerNode(Number(PORT), config.ssl.domain)
}

async function upsertHosts (): Promise<void> {
  const hosts: Partial<Host>[] = [
    {
      url: 'http://localhost:11021',
      type: HostType.superdoge,
      priority: 0,
    },
    {
      url: 'http://localhost:11023',
      type: HostType.registry,
      priority: 0,
    },
  ]

  config.superdogeURLs.forEach(url => {
    hosts.push({
      url,
      type: HostType.superdoge,
      priority: 1,
    })
  })
  config.registryURLs.forEach(url => {
    hosts.push({
      url,
      type: HostType.registry,
      priority: 1,
    })
  })

  await getManager().createQueryBuilder()
    .insert()
    .into(Host)
    .values(hosts)
    .onConflict('DO NOTHING')
    .execute()
}

startServer()