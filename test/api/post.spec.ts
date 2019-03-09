import { createConnections, getConnection, Connection } from 'typeorm'
import { assert } from 'chai'
import { TransactionHandler } from '../../src/api/handlers/transaction'
import { seedBaseUser, seedBorkTx, seedProfileTx, seedLikeTx } from '../helpers/seeds'
import { Transaction, TransactionType } from '../../src/db/entities/transaction'
import { User } from '../../src/db/entities/user'
import { assertBorkTx, assertProfileTx } from '../helpers/assertions'
import { database } from '../helpers/database'

describe('Transaction Handler', async () => {
  let connections: Connection[]
  let transactionHandler: TransactionHandler

  before(async () => {
    connections = await createConnections([database])
    transactionHandler = new TransactionHandler()
  })

  beforeEach(async () => {
    await getConnection('default').synchronize(true)
  })

  after(async () => {
    await getConnection('default').synchronize(true)
    await Promise.all(connections.map(c => c.close()))
  })

  describe('GET /transactions && GET /transactions/:id', async () => {
    let user: User
    let borkTx: Transaction
    let profileTx: Transaction

    beforeEach(async () => {
      user = await seedBaseUser()
      borkTx = await seedBorkTx(user)
      profileTx = await seedProfileTx(user)
    })

    it('returns all txs', async () => {
      const transactions = await transactionHandler.index(user.address)

      assert.equal(transactions.length, 2)
      assertProfileTx(transactions[0])
      assertBorkTx(transactions[1])
    })

    it('returns all POST txs', async () => {
      const transactions = await transactionHandler.index(
        user.address,
        undefined,
        undefined,
        [TransactionType.bork, TransactionType.comment, TransactionType.rebork, TransactionType.like],
      )

      assert.equal(transactions.length, 1)
      assert.equal(transactions[0].txid, borkTx.txid)
    })

    it('returns all PROFILE txs', async () => {
      const transactions = await transactionHandler.index(
        user.address,
        undefined,
        undefined,
        [TransactionType.setName, TransactionType.setBio, TransactionType.setAvatar],
      )

      assert.equal(transactions.length, 1)
      assert.equal(transactions[0].txid, profileTx.txid)
    })

    it('returns a single tx', async () => {
      const p1 = await transactionHandler.get(user.address, borkTx.txid)
      const p2 = await transactionHandler.get(user.address, profileTx.txid)

      assertBorkTx(p1)
      assert.equal(p1.txid, borkTx.txid)
      assert.equal(p2.txid, profileTx.txid)
    })
  })

  describe('GET /transactions/:id/users', async () => {
    let user: User
    let user2: User
    let borkTx: Transaction
    let likeTx: Transaction

    beforeEach(async () => {
      user = await seedBaseUser()
      user2 = await seedBaseUser()
      await seedBaseUser()
      borkTx = await seedBorkTx(user)
      likeTx = await seedLikeTx(user2, borkTx)
    })

    it('returns all tx likers', async () => {
      const users = await transactionHandler.indexTxUsers(user.address, borkTx.txid, TransactionType.like)

      assert.equal(users.length, 1)
      assert.equal(users[0].address, user2.address)
    })
  })
})