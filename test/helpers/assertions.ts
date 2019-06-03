import { assert } from 'chai'
import { User } from '../../src/db/entities/user'
import { Bork } from '../../src/db/entities/bork'
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

export function assertBaseBork (bork: Bork) {
  assert.exists(bork.txid)
  assert.exists(bork.createdAt)
  assert.exists(bork.nonce)
  assert.exists(bork.type)
  assert.exists(bork.sender)
}

export function assertBork (bork: Bork) {
  assertBaseBork(bork)
  assert.equal(bork.type, BorkType.Bork)
  assert.equal(bork.position, 0)
  assert.exists(bork.content)
}

export function assertComment (bork: Bork) {
  assertBaseBork(bork)
  assert.equal(bork.type, BorkType.Comment)
  assert.equal(bork.position, 0)
  assert.exists(bork.parent)
  assert.exists(bork.content)
}

export function assertRebork (bork: Bork) {
  assertBaseBork(bork)
  assert.equal(bork.type, BorkType.Rebork)
  assert.equal(bork.position, 0)
  assert.exists(bork.parent)
}

export function assertExtension (bork: Bork) {
  assertBaseBork(bork)
  assert.equal(bork.type, BorkType.Extension)
  assert.notEqual(bork.position, 0)
  assert.exists(bork.parent)
  assert.exists(bork.content)
}