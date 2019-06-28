import 'reflect-metadata'
import { createConnection } from 'typeorm'
import app from './api/app'
import { Main } from './main'

const PORT = process.env.PORT || '11020'

async function startServer () {
  await createConnection()
  await app.listen(PORT)
  console.log(`Borker Server listening on port ${PORT}`)
  new Main().sync()
}

startServer()