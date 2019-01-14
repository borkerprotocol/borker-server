import { assert } from 'chai'
import { User } from '../../src/db/entities/user'
import { Post } from '../../src/db/entities/post'

export function assertPost (post: Post) {
  assert.exists(post.txid)
  assert.exists(post.createdAt)
  assert.exists(post.sender)
  assert.exists(post.type)
  assert.exists(post.content)
  assert.exists(post.value)
  assert.exists(post.fee)
}

export function assertUser (user: User) {
  assert.exists(user.address)
  assert.exists(user.createdAt)
  assert.exists(user.birthBlock)
  assert.exists(user.name)
  assert.exists(user.avatarLink)
  assert.exists(user.bio)
}