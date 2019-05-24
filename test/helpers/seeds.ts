import { getManager } from 'typeorm'
import { UserSeed, User } from '../../src/db/entities/user'
import { Post, PostSeed, PostType, PostTxWithParentSeed } from '../../src/db/entities/post'
import { randomAddressOrTxid } from './random-generators'
import { UtxoSeed, Utxo } from '../../src/db/entities/utxo'

function getUserSeed (): UserSeed {
  const address = randomAddressOrTxid(true)
  return {
    createdAt: new Date(),
    address,
    birthBlock: Math.floor(Math.random() * 2000001),
    name: address.substr(0, 9),
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

export async function seedUtxo (attributes: Partial<UtxoSeed> = {}) {
  const seed: UtxoSeed = Object.assign({
    txid: randomAddressOrTxid(false),
    index: 0,
    createdAt: new Date(),
    address: randomAddressOrTxid(true),
    value: 100000000,
    raw: 'thisisarawtxhex',
  }, attributes)

  const utxo = getManager().create(Utxo, seed)
  return getManager().save(utxo)
}

export async function seedPost (sender: User, attributes: Partial<PostSeed> = {}) {
  const seed: PostSeed = {
    createdAt: new Date(),
    txid: randomAddressOrTxid(false),
    nonce: 0,
    type: PostType.bork,
    content: 'post content',
    sender,
  }

  const post = getManager().create(Post, Object.assign(seed, attributes))

  return getManager().save(post)
}

export async function seedFlag (user: User, post: Post): Promise<void> {
  return getManager()
    .createQueryBuilder()
    .relation(User, 'flags')
    .of(user)
    .add(post)
}

export async function seedFollow (follower: User, followed: User) {
  return getManager()
    .createQueryBuilder()
    .relation(User, 'following')
    .of(follower)
    .add(followed)
}

export async function seedBlock (blocker: User, blocked: User) {
  return getManager()
    .createQueryBuilder()
    .relation(User, 'blocking')
    .of(blocker)
    .add(blocked)
}
