import { createConnections, getConnection, Connection, getManager } from 'typeorm'
import { assert } from 'chai'
import { UserHandler } from '../../src/api/handlers/user'
import { seedBaseUser, seedFullUser, seedFollowTx, seedUtxo } from '../helpers/seeds'
import { User } from '../../src/db/entities/user'
import { assertBaseUser, assertFullUser, assertThrows } from '../helpers/assertions'
import { database } from '../helpers/database'
import { Errors } from 'typescript-rest'

describe('User Handler', async () => {
  let connections: Connection[]
  let userHandler: UserHandler
  let user1: User
  let user2: User

  before(async () => {
    connections = await createConnections([database])
    userHandler = new UserHandler()
  })

  beforeEach(async () => {
    await getConnection('default').synchronize(true)
    const [ u1, u2 ] = await Promise.all([
      seedBaseUser(),
      seedFullUser(),
    ])
    user1 = u1
    user2 = u2
  })

  after(async () => {
    await getConnection('default').synchronize(true)
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

    beforeEach(async () => {
      await seedFollowTx(user1, user2)
      user1.followers = [user2]
      await getManager().save(user1)
    })

    it('returns all followers', async () => {
      const users = await userHandler.indexFollows(user1.address, user1.address, 'followers')

      assert.equal(users.length, 1)
      assert.equal(users[0].address, user2.address)
    })
  })

  describe('GET /users/:address/balance', async () => {

    beforeEach(async () => {
      await Promise.all([
        seedUtxo({ address: user1.address }),
        seedUtxo({ address: user1.address }),
      ])
    })

    it('returns user balance', async () => {
      const balance = await userHandler.getBalance(user1.address)

      assert.equal(balance, 200000000)
    })
  })

  describe('GET /users/:address/utxos', async () => {

    beforeEach(async () => {
      await Promise.all([
        seedUtxo({ address: user1.address }),
        seedUtxo({ address: user1.address }),
        seedUtxo({ address: user1.address }),
      ])
    })

    it('returns enough utxos to satisfy requirement', async () => {
      const utxos = await userHandler.getUtxos(user1.address, '150000000', '1')

      assert.equal(utxos.length, 2)
    })

    it('throws for unsuffient funds', async () => {

      assertThrows(userHandler.getUtxos(user1.address, '350000000', '2'), new Errors.BadRequestError('insufficient funds'))
    })
  })
})