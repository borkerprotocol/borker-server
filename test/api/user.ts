import { createConnections, getConnection, getManager, Connection } from 'typeorm'
import { assert } from 'chai'
import { User } from '../../src/db/entities/user'
import { UserHandler } from '../../src/api/handlers/user'
import { config } from '../../src/config/config'

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

  describe('GET /users', async () => {

    beforeEach(async () => {
      const user1 = getManager().create(User, {
        address: '3n298y492487n32y4m23y4x8n23',
        name: 'Matt',
        birthBlock: 1234,
      })
      const user2 = getManager().create(User, {
        address: '3h423yhtyger9384rxgn238xemj3',
        name: 'Aiden',
        birthBlock: 2345,
      })
      await getManager().save([user1, user2])
    })

    it('returns all users', async () => {
      const users = await userHandler.index()
      assert.equal(users.length, 2)
    })
  })
})