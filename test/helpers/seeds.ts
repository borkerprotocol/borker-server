import { getManager } from 'typeorm'
import { UserSeed, User } from '../../src/db/entities/user'
import { Post, PostSeed } from '../../src/db/entities/post'
import { randomAddressOrTxid } from './random-generators'
import { UtxoSeed, Utxo } from '../../src/db/entities/utxo'
import { OrphanSeed, Orphan } from '../../src/db/entities/orphan'
import { BorkType } from 'borker-rs-node'

function getUserSeed (): UserSeed {
  const address = randomAddressOrTxid(true)
  return {
    createdAt: new Date(),
    address,
    birthBlock: Math.floor(Math.random() * 2000001),
    name: address.substr(0, 9),
  }
}

export async function seedBaseUser (attributes: Partial<UserSeed> = {}): Promise<User> {
  const seed: UserSeed = Object.assign(getUserSeed(), attributes)

  const user = getManager().create(User, seed)
  return getManager().save(user)
}

export async function seedFullUser (attributes: Partial<UserSeed> = {}): Promise<User> {
  const seed: UserSeed = {
    ...getUserSeed(),
    name: 'name',
    bio: 'biography',
    avatarLink: 'https://fakeAvatarURL.com',
  }

  const user = getManager().create(User, Object.assign(seed, attributes))
  return getManager().save(user)
}

export async function seedUtxo (attributes: Partial<UtxoSeed> = {}): Promise<Utxo> {
  const seed: UtxoSeed = Object.assign({
    txid: randomAddressOrTxid(false),
    position: 0,
    createdAt: new Date(),
    address: randomAddressOrTxid(true),
    value: 100000000,
    raw: 'thisisarawtxhex',
  }, attributes)

  const utxo = getManager().create(Utxo, seed)
  return getManager().save(utxo)
}

export async function seedPost (sender: User, attributes: Partial<PostSeed> = {}): Promise<Post> {
  const seed: PostSeed = {
    createdAt: new Date(),
    txid: randomAddressOrTxid(false),
    nonce: 0,
    position: 0,
    type: BorkType.Bork,
    content: 'post content',
    sender,
  }

  const post = getManager().create(Post, Object.assign(seed, attributes))

  return getManager().save(post)
}

export async function seedOrphan (sender: User, referencePost: Post, attributes: Partial<OrphanSeed> = {}): Promise<Orphan> {
  const seed: OrphanSeed = {
    createdAt: new Date(),
    txid: randomAddressOrTxid(false),
    type: BorkType.Comment,
    content: 'orphan content',
    sender,
    referenceId: referencePost.txid.substring(0, 1),
    referenceSenderAddress: referencePost.senderAddress,
  }

  const post = getManager().create(Orphan, Object.assign(seed, attributes))

  return getManager().save(post)
}

export async function seedFlag (user: User, post: Post): Promise<void> {
  return getManager()
    .createQueryBuilder()
    .relation(User, 'flags')
    .of(user)
    .add(post)
}

export async function seedFollow (follower: User, followed: User): Promise<void> {
  return getManager()
    .createQueryBuilder()
    .relation(User, 'following')
    .of(follower)
    .add(followed)
}

export async function seedBlock (blocker: User, blocked: User): Promise<void> {
  return getManager()
    .createQueryBuilder()
    .relation(User, 'blocking')
    .of(blocker)
    .add(blocked)
}
