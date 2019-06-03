import { createConnections, getConnection, Connection } from 'typeorm'
import { assert } from 'chai'
import { BorkHandler } from '../../src/api/handlers/bork'
import { seedBaseUser, seedBork, seedFullUser } from '../helpers/seeds'
import { Bork } from '../../src/db/entities/bork'
import { User } from '../../src/db/entities/user'
import { database } from '../helpers/database'

describe('Bork Handler', async () => {
  let connections: Connection[]
  let borkHandler: BorkHandler
  let user1: User
  let user2: User

  before(async () => {
    connections = await createConnections([database])
    await getConnection('default').synchronize(true)

    const [ u1, u2 ] = await Promise.all([
      seedBaseUser(),
      seedFullUser(),
    ])
    user1 = u1
    user2 = u2

    borkHandler = new BorkHandler()
  })

  after(async () => {
    await Promise.all(connections.map(c => c.close()))
  })

  describe('GET /borks', async () => {

    it('', async () => {

    })
  })

  describe('GET /borks/:id', async () => {

    it('', async () => {

    })
  })

  describe('GET /borks/:id/users', async () => {

    it('', async () => {

    })
  })
})