import 'reflect-metadata'
import { createConnection, getManager } from 'typeorm'
import app from './api/app'
import * as config from '../borkerconfig.json'
import { Main } from './main'
import { Host } from './db/entities/host'

const PORT = process.env.PORT || '11020'

async function startServer () {
  await createConnection()
  await app.listen(PORT)
  await upsertHosts()
  console.log(`Borker Server listening on port ${PORT}`)
  new Main().sync()
}

async function upsertHosts (): Promise<void> {
  const hosts: Partial<Host>[] = [
    {
      url: 'http://localhost:11021',
      priority: 0,
    },
  ]

  config.superdogeURLs.forEach(url => {
    hosts.push({
      url,
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