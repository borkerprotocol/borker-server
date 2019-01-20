import { assert } from 'chai'
import { User } from '../../src/db/entities/user'
import { Transaction, TransactionType } from '../../src/db/entities/transaction'

export function assertBaseTx (tx: Transaction) {
  assert.exists(tx.txid)
  assert.exists(tx.createdAt)
  assert.exists(tx.nonce)
  assert.exists(tx.sender)
  assert.exists(tx.type)
  assert.exists(tx.fee)
}

export function assertBorkTx (tx: Transaction) {
  assertBaseTx(tx)
  assert.equal(tx.type, TransactionType.bork)
  assert.exists(tx.content)
  assert.notExists(tx.value)
}

export function assertExtensionTx (tx: Transaction) {
  assertBorkTx(tx)
  assert.equal(tx.type, TransactionType.extension)
  assert.exists(tx.parent)
}

export function assertCommentTx (tx: Transaction) {
  assertBaseTx(tx)
  assert.equal(tx.type, TransactionType.comment)
  assert.exists(tx.parent)
  assert.exists(tx.content)
}

export function assertReborkTx (tx: Transaction) {
  assertBaseTx(tx)
  assert.equal(tx.type, TransactionType.rebork)
  assert.exists(tx.parent)
}

export function assertLikeTx (tx: Transaction) {
  assertBaseTx(tx)
  assert.equal(tx.type, TransactionType.like)
  assert.exists(tx.parent)
  assert.notExists(tx.content)
  assert.notExists(tx.commentsCount)
  assert.notExists(tx.likesCount)
  assert.notExists(tx.reborksCount)
}

export function assertProfileTx (tx: Transaction) {
  assertBaseTx(tx)
  assert.exists(tx.content)
  assert.notExists(tx.recipient)
  assert.notExists(tx.parent)
  assert.notExists(tx.value)
  assert.notExists(tx.commentsCount)
  assert.notExists(tx.likesCount)
  assert.notExists(tx.reborksCount)
}

export function assertNameTx (tx: Transaction) {
  assertProfileTx(tx)
  assert.equal(tx.type, TransactionType.setName)
}

export function assertBioTx (tx: Transaction) {
  assertProfileTx(tx)
  assert.equal(tx.type, TransactionType.setBio)
}

export function assertAvatarTx (tx: Transaction) {
  assertProfileTx(tx)
  assert.equal(tx.type, TransactionType.setAvatar)
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