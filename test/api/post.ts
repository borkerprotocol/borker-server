import { createConnections, getConnection, Connection } from 'typeorm'
import { assert } from 'chai'
import { PostHandler } from '../../src/api/handlers/post'
import { config } from '../../src/config/config'
import { seedPost, seedUser } from '../util/seeds'
import { Post } from '../../src/db/entities/post'
import { User } from '../../src/db/entities/user'
import { assertPost, assertUser } from '../util/assertions'

describe('Post Handler', async () => {
  let connections: Connection[]
  let postHandler: PostHandler

  before(async () => {
    connections = await createConnections([config.database])
    postHandler = new PostHandler()
  })

  beforeEach(async () => {
    await getConnection('default').synchronize(true)
  })

  after(async () => {
    await Promise.all(connections.map(c => c.close()))
  })

  describe('GET /posts && GET /posts/:id', async () => {
    let user: User
    let post1: Post
    let post2: Post

    beforeEach(async () => {
      user = await seedUser()
      post1 = await seedPost(user)
      post2 = await seedPost(user)
    })

    it('returns all posts', async () => {
      const posts = await postHandler.index()
      console.log(posts[0])

      assertPost(posts[0])
      assertPost(posts[1])
    })

    it('returns a single post', async () => {
      const p1 = await postHandler.get(post1.txid)
      const p2 = await postHandler.get(post2.txid)

      assertPost(p1)
      assertPost(p2)
      assert.deepEqual(p1.txid, post1.txid)
      assert.deepEqual(p2.txid, post2.txid)
    })
  })
})