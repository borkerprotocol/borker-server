import { createConnections, getConnection, Connection } from 'typeorm'
import { assert } from 'chai'
import { PostHandler } from '../../src/api/handlers/post'
import { seedBaseUser, seedPost, seedFullUser, seedBlock } from '../helpers/seeds'
import { Post } from '../../src/db/entities/post'
import { User } from '../../src/db/entities/user'
import { database } from '../helpers/database'
import { Block } from '../../src/db/entities/block'

describe('Post Handler', async () => {
  let connections: Connection[]
  let postHandler: PostHandler
  let block: Block
  let user1: User
  let user2: User

  before(async () => {
    connections = await createConnections([database])
    await getConnection('default').synchronize(true)

    block = await seedBlock()
    const [ u1, u2 ] = await Promise.all([
      seedBaseUser(block),
      seedFullUser(block),
    ])
    user1 = u1
    user2 = u2

    postHandler = new PostHandler()
  })

  after(async () => {
    await Promise.all(connections.map(c => c.close()))
  })

  describe('GET /posts', async () => {

    it('', async () => {

    })
  })

  describe('GET /post/:id', async () => {

    it('', async () => {

    })
  })

  describe('GET /posts/:id/users', async () => {

    it('', async () => {

    })
  })
})