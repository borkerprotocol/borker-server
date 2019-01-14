import { createConnections, getConnection, Connection } from 'typeorm'
import { assert } from 'chai'
import { UserHandler } from '../../src/api/handlers/user'
import { config } from '../../src/config/config'
import { seedUser } from '../util/seeds'
import { User } from '../../src/db/entities/user'
import { assertUser } from '../util/assertions'

describe('User Handler', async () => {
  let connections: Connection[]
  let userHandler: UserHandler

  before(async () => {
    connections = await createConnections([config.database])
    userHandler = new UserHandler()
  })

  beforeEach(async () => {
    await getConnection('default').synchronize(true)
  })

  after(async () => {
    await Promise.all(connections.map(c => c.close()))
  })

  describe('GET /users && GET /users/:id', async () => {
    let user1: User
    let user2: User

    beforeEach(async () => {
      user1 = await seedUser()
      user2 = await seedUser()
    })

    it('returns all users', async () => {
      const users = await userHandler.index()

      assertUser(users[0])
      assertUser(users[1])
    })

    it('returns a single user', async () => {
      const u1 = await userHandler.get(user1.address)
      const u2 = await userHandler.get(user2.address)

      assertUser(u1)
      assertUser(u2)
      assert.deepEqual(u1.address, user1.address)
      assert.deepEqual(u2.address, user2.address)
    })
  })
})