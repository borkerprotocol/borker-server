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
  assert.isEmpty(tx.mentions)
}

export function assertExtensionTx (tx: Transaction) {
  assertBorkTx(tx)
  assert.equal(tx.type, TransactionType.extension)
  assert.exists(tx.parent)
}

export function assertCommentTx (tx: Transaction) {
  assertBaseTx(tx)
  assert.equal(tx.type, TransactionType.comment)
  assert.isNotEmpty(tx.mentions)
  assert.exists(tx.parent)
  assert.exists(tx.content)
}

export function assertReborkTx (tx: Transaction) {
  assertBaseTx(tx)
  assert.equal(tx.type, TransactionType.rebork)
  assert.isNotEmpty(tx.mentions)
  assert.exists(tx.parent)
}

export function assertLikeTx (tx: Transaction) {
  assertBaseTx(tx)
  assert.equal(tx.type, TransactionType.like)
  assert.exists(tx.parent)
  assert.isNotEmpty(tx.mentions)
  assert.notExists(tx.content)
  assert.equal(tx.commentsCount, 0)
  assert.equal(tx.likesCount, 0)
  assert.equal(tx.reborksCount, 0)
}

export function assertFollowTx (tx: Transaction) {
  assertBaseTx(tx)
  assert.equal(tx.type, TransactionType.follow)
  assert.exists(tx.content)
  assert.isEmpty(tx.mentions)
  assert.notExists(tx.parent)
  assert.equal(tx.commentsCount, 0)
  assert.equal(tx.likesCount, 0)
  assert.equal(tx.reborksCount, 0)
}

export function assertUnfollowTx (tx: Transaction) {
  assertBaseTx(tx)
  assert.equal(tx.type, TransactionType.unfollow)
  assert.exists(tx.content)
  assert.isEmpty(tx.mentions)
  assert.notExists(tx.parent)
  assert.equal(tx.commentsCount, 0)
  assert.equal(tx.likesCount, 0)
  assert.equal(tx.reborksCount, 0)
}

export function assertProfileTx (tx: Transaction) {
  assertBaseTx(tx)
  assert.exists(tx.content)
  assert.isEmpty(tx.mentions)
  assert.notExists(tx.parent)
  assert.equal(tx.commentsCount, 0)
  assert.equal(tx.likesCount, 0)
  assert.equal(tx.reborksCount, 0)
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