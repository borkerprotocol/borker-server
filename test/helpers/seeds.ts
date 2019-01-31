import { getManager } from 'typeorm'
import { UserSeed, User } from '../../src/db/entities/user'
import { Transaction, TxSeed, TransactionType, BorkTxSeed, ProfileTxSeed, CommentTxSeed, ReborkTxSeed, LikeTxSeed, ExtensionTxSeed, FollowTxSeed } from '../../src/db/entities/transaction'
import { randomAddressOrTxid } from './random-generators'
import BigNumber from 'bignumber.js'

function getTxSeed (): TxSeed {
  return {
    createdAt: new Date(),
    txid: randomAddressOrTxid(false),
    nonce: 0,
    type: undefined,
    fee: new BigNumber(1),
    sender: undefined,
  }
}

function getUserSeed (): UserSeed {
  return {
    createdAt: new Date(),
    address: randomAddressOrTxid(),
    birthBlock: Math.floor(Math.random() * 2000001),
  }
}

export async function seedBaseUser (attributes: Partial<UserSeed> = {}) {
  const seed: UserSeed = Object.assign(getUserSeed(), attributes)

  const user = getManager().create(User, seed)
  return getManager().save(user)
}

export async function seedFullUser (attributes: Partial<UserSeed> = {}) {
  const seed: UserSeed = {
    ...getUserSeed(),
    name: 'name',
    bio: 'biography',
    avatarLink: 'https://fakeAvatarURL.com',
  }

  const user = getManager().create(User, Object.assign(seed, attributes))
  return getManager().save(user)
}

export async function seedBorkTx (sender: User, attributes: Partial<BorkTxSeed> = {}) {
  const seed: BorkTxSeed = {
    ...getTxSeed(),
    type: TransactionType.bork,
    content: 'bork content',
    sender,
  }

  const transaction = getManager().create(Transaction, Object.assign(seed, attributes))
  return getManager().save(transaction)
}

export async function seedEntensionTx (sender: User, parent: Transaction, attributes: Partial<UserSeed> = {}) {
  const seed: ExtensionTxSeed = {
    ...getTxSeed(),
    type: TransactionType.extension,
    content: 'child content',
    parent,
    sender,
  }

  const transaction = getManager().create(Transaction, Object.assign(seed, attributes))
  return getManager().save(transaction)
}

export async function seedCommentTx (sender: User, recipient: User, parent: Transaction, attributes: Partial<UserSeed> = {}) {
  const seed: CommentTxSeed = {
    ...getTxSeed(),
    type: TransactionType.comment,
    content: 'comment content',
    value: new BigNumber(10),
    parent,
    recipient,
    sender,
  }

  const transaction = getManager().create(Transaction, Object.assign(seed, attributes))
  return getManager().save(transaction)
}

export async function seedReborkTx (sender: User, recipient: User, parent: Transaction, attributes: Partial<UserSeed> = {}) {
  const seed: ReborkTxSeed = {
    ...getTxSeed(),
    type: TransactionType.rebork,
    content: null,
    value: new BigNumber(10),
    parent,
    recipient,
    sender,
  }

  const transaction = getManager().create(Transaction, Object.assign(seed, attributes))
  return getManager().save(transaction)
}

export async function seedLikeTx (sender: User, recipient: User, parent: Transaction, attributes: Partial<UserSeed> = {}) {
  const seed: LikeTxSeed = {
    ...getTxSeed(),
    type: TransactionType.like,
    value: new BigNumber(10),
    parent,
    recipient,
    sender,
  }

  const transaction = getManager().create(Transaction, Object.assign(seed, attributes))
  return getManager().save(transaction)
}

export async function seedFollowTx (sender: User, followed: User, attributes: Partial<UserSeed> = {}) {
  const seed: FollowTxSeed = {
    ...getTxSeed(),
    type: TransactionType.follow,
    content: followed.address,
    sender,
  }

  const transaction = getManager().create(Transaction, Object.assign(seed, attributes))
  return getManager().save(transaction)
}

export async function seedUnfollowTx (sender: User, unfollowed: User, attributes: Partial<UserSeed> = {}) {
  const seed: FollowTxSeed = {
    ...getTxSeed(),
    type: TransactionType.unfollow,
    content: unfollowed.address,
    sender,
  }

  const transaction = getManager().create(Transaction, Object.assign(seed, attributes))
  return getManager().save(transaction)
}

export async function seedProfileTx (sender: User, type: TransactionType = TransactionType.setName, attributes: Partial<UserSeed> = {}) {
  let content: string
  switch (type) {
    case TransactionType.setName:
      content = 'name'
      break
    case TransactionType.setBio:
      content = 'biography'
      break
    case TransactionType.setAvatar:
      content = 'https://fakeAvatarURL.com'
      break
  }

  const extended: ProfileTxSeed = {
    ...getTxSeed(),
    type,
    content,
    sender,
  }
  const seed = Object.assign(extended, attributes)

  const transaction = getManager().create(Transaction, seed)
  return getManager().save(transaction)
}