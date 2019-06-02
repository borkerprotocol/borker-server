import { assert } from 'chai'
import { User } from '../../src/db/entities/user'
import { Post } from '../../src/db/entities/post'
import { Errors } from 'typescript-rest'
import { BorkType } from 'borker-rs-node'

export async function assertThrows<T> (func: Promise<T>, expectedError?: Errors.HttpError) {
  let error: Errors.HttpError

  try {
    await func
  } catch (err) {
    error = err
  }

  assert(error, `expected error: "${expectedError.message}"`)

  if (error) {
    assert.equal(error.statusCode, expectedError.statusCode)
    assert.equal(error.message, expectedError.message)
  }
}

export function assertBaseUser (user: User) {
  assert.exists(user.address)
  assert.exists(user.createdAt)
  assert.exists(user.birthBlock)
}

export function assertFullUser (user: User) {
  assertBaseUser(user)
  assert.exists(user.name)
  assert.exists(user.bio)
  assert.exists(user.avatarLink)
}

export function assertPost (post: Post) {
  assert.exists(post.txid)
  assert.exists(post.createdAt)
  assert.exists(post.nonce)
  assert.exists(post.type)
  assert.exists(post.sender)
}

export function assertBork (post: Post) {
  assertPost(post)
  assert.equal(post.type, BorkType.Bork)
  assert.exists(post.content)
}

export function assertComment (post: Post) {
  assertPost(post)
  assert.equal(post.type, BorkType.Comment)
  assert.exists(post.parent)
  assert.exists(post.content)
}

export function assertRebork (post: Post) {
  assertPost(post)
  assert.equal(post.type, BorkType.Rebork)
  assert.exists(post.parent)
}

export function assertExtension (post: Post) {
  assertPost(post)
  assert.equal(post.type, BorkType.Extension)
  assert.exists(post.parent)
  assert.exists(post.content)
}