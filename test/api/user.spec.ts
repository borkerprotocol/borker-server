import { createConnections, getConnection, Connection } from 'typeorm'
import { assert } from 'chai'
import { UserHandler } from '../../src/api/handlers/user'
import { seedBorkTx, seedBaseUser, seedFullUser, seedCommentTx, seedLikeTx } from '../helpers/seeds'
import { User } from '../../src/db/entities/user'
import { assertBaseUser, assertFullUser, assertBorkTx, assertCommentTx } from '../helpers/assertions'
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
      const users = await userHandler.index()

      assertBaseUser(users[0])
      assertFullUser(users[1])
    })

    it('returns a single user', async () => {
      const u1 = await userHandler.get(user1.address)
      const u2 = await userHandler.get(user2.address)

      assertBaseUser(u1)
      assertFullUser(u2)
      assert.equal(u1.address, user1.address)
      assert.equal(u2.address, user2.address)
    })

    describe('GET /users/:id/transactions', async () => {  
      beforeEach(async () => {
        const transaction1 = await seedBorkTx(user1)
        await seedCommentTx(user1, transaction1)
        await seedLikeTx(user2, transaction1)
      })
  
      it('returns all user transactions', async () => {
        const transactions = await userHandler.indexTransactions(user1.address)
  
        assert.equal(transactions.length, 2)
        assertCommentTx(transactions[0])
        assertBorkTx(transactions[1])
      })
    })
  })
})