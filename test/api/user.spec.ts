import { createConnections, getConnection, Connection } from 'typeorm'
import { assert } from 'chai'
import { UserHandler } from '../../src/api/handlers/user'
import { seedBaseUser, seedFullUser, seedFollowBlock } from '../helpers/seeds'
import { User } from '../../src/db/entities/user'
import { assertBaseUser, assertFullUser, assertThrows } from '../helpers/assertions'
import { database } from '../helpers/database'
import { Errors } from 'typescript-rest'
import { BorkType } from 'borker-rs-node'

describe('User Handler', async () => {
  let connections: Connection[]
  let userHandler: UserHandler
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
    await seedFollowBlock(user1, user2, BorkType.Follow)

    userHandler = new UserHandler()
  })

  after(async () => {
    await Promise.all(connections.map(c => c.close()))
  })

  describe('GET /users && GET /users/:address', async () => {

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

  describe('GET /users/:address/users', async () => {

    it('returns all followers', async () => {
      const users = await userHandler.indexFollows(user1.address, user1.address, 'followers')

      assert.equal(users.length, 1)
      assert.equal(users[0].address, user2.address)
    })
  })

  describe('GET /users/:address/balance', async () => {

    beforeEach(async () => {

    })

    it('returns user balance', async () => {

    })
  })

  describe('GET /users/:address/utxos', async () => {

    beforeEach(async () => {

    })

    it('returns enough utxos to satisfy requirement', async () => {

    })

    it('throws for unsuffient funds', async () => {

    })
  })
})