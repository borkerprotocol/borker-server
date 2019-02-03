import { getManager, getRepository } from 'typeorm'
import { UserSeed, User } from '../../src/db/entities/user'
import { Transaction, TxSeed, TransactionType, BorkTxSeed, ProfileTxSeed, CommentTxSeed, ReborkTxSeed, LikeTxSeed, ExtensionTxSeed, FollowTxSeed, UnfollowTxSeed } from '../../src/db/entities/transaction'
import { randomAddressOrTxid } from './random-generators'
import BigNumber from 'bignumber.js'
import { Mention } from '../../src/db/entities/mention'
import { Output } from '../../src/util/mocks'

function getTxSeed (type: TransactionType, sender: User, outputs: Output[] = []): TxSeed {

  const mentions = seedMentions(outputs)

  return {
    createdAt: new Date(),
    txid: randomAddressOrTxid(false),
    nonce: 0,
    type,
    sender,
    mentions,
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

export async function seedBorkTx (sender: User, outputs: Output[] = [], attributes: Partial<BorkTxSeed> = {}) {
  const seed: BorkTxSeed = {
    ...getTxSeed(TransactionType.bork, sender, outputs),
    content: 'bork content',
  }

  const transaction = getManager().create(Transaction, Object.assign(seed, attributes))

  return getManager().save(transaction)
}

export async function seedEntensionTx (sender: User, parent: Transaction, outputs: Output[], attributes: Partial<UserSeed> = {}) {
  const seed: ExtensionTxSeed = {
    ...getTxSeed(TransactionType.extension, sender, outputs),
    content: 'child content',
    parent,
  }

  const transaction = getManager().create(Transaction, Object.assign(seed, attributes))

  return getManager().save(transaction)
}

export async function seedCommentTx (sender: User, parent: Transaction, outputs: Output[], attributes: Partial<UserSeed> = {}) {
  const seed: CommentTxSeed = {
    ...getTxSeed(TransactionType.comment, sender, outputs),
    content: 'comment content',
    parent,
  }

  const transaction = getManager().create(Transaction, Object.assign(seed, attributes))

  return getManager().save(transaction)
}

export async function seedReborkTx (sender: User, parent: Transaction, outputs: Output[], attributes: Partial<UserSeed> = {}) {
  const seed: ReborkTxSeed = {
    ...getTxSeed(TransactionType.rebork, sender, outputs),
    content: null,
    parent,
  }

  const transaction = getManager().create(Transaction, Object.assign(seed, attributes))

  return getManager().save(transaction)
}

export async function seedLikeTx (sender: User, parent: Transaction, outputs: Output[], attributes: Partial<UserSeed> = {}) {
  const seed: LikeTxSeed = {
    ...getTxSeed(TransactionType.like, sender, outputs),
    parent,
  }

  const transaction = getManager().create(Transaction, Object.assign(seed, attributes))

  return getManager().save(transaction)
}

export async function seedFollowTx (sender: User, output: Output, attributes: Partial<UserSeed> = {}) {
  const seed: FollowTxSeed = {
    ...getTxSeed(TransactionType.follow, sender, [output]),
  }

  const transaction = getManager().create(Transaction, Object.assign(seed, attributes))

  return getManager().save(transaction)
}

export async function seedUnfollowTx (sender: User, output: Output, attributes: Partial<UserSeed> = {}) {
  const seed: UnfollowTxSeed = {
    ...getTxSeed(TransactionType.unfollow, sender, [output]),
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

  const seed: ProfileTxSeed = {
    ...getTxSeed(type, sender),
    content,
  }

  const transaction = getManager().create(Transaction, Object.assign(seed, attributes))

  return getManager().save(transaction)
}

export function seedMentions (outputs: Output[]): Mention[] {
  return outputs.map(output => {
    return getRepository(Mention).create({
      user: { address: output.address },
      value: new BigNumber(output.value),
    })
  })
}