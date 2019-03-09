import { createConnections, getConnection, Connection } from 'typeorm'
import { assert } from 'chai'
import { UserHandler } from '../../src/api/handlers/user'
import { seedBaseUser, seedFullUser, seedFollowTx } from '../helpers/seeds'
import { User } from '../../src/db/entities/user'
import { assertBaseUser, assertFullUser } from '../helpers/assertions'
import { database } from '../helpers/database'

describe('User Handler', async () => {
  let connections: Connection[]
  let userHandler: UserHandler

  before(async () => {
    connections = await createConnections([database])
    userHandler = new UserHandler()
  })

  beforeEach(async () => {
    await getConnection('default').synchronize(true)
  })

  after(async () => {
    await getConnection('default').synchronize(true)
    await Promise.all(connections.map(c => c.close()))
  })

  describe('GET /users && GET /users/:id', async () => {
    let user1: User
    let user2: User

    beforeEach(async () => {
      user1 = await seedBaseUser()
      user2 = await seedFullUser()
    })

    it('returns all users', async () => {
      const users = await userHandler.index(user1.address)

      assert.equal(users.length, 2)
    })

    it('returns a single user', async () => {
      const u1 = await userHandler.get(user1.address, user1.address)
      const u2 = await userHandler.get(user1.address, user2.address)

      assertBaseUser(u1)
      assertFullUser(u2)
      assert.equal(u1.address, user1.address)
      assert.equal(u2.address, user2.address)
    })
  })

  describe('GET /users/:id/users', async () => {
    let user1: User
    let user2: User

    beforeEach(async () => {
      user1 = await seedBaseUser()
      user2 = await seedBaseUser()
      await seedFollowTx(user1, user2)
    })

    it('returns all followers', async () => {
      const users = await userHandler.indexFollows(user1.address, user1.address, 'followers')

      assert.equal(users.length, 1)
      assert.equal(users[0].address, user2.address)
    })
  })
})