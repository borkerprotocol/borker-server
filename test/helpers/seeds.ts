import { getManager } from 'typeorm'
import { UserSeed, User } from '../../src/db/entities/user'
import { Post, PostSeed } from '../../src/db/entities/post'
import { randomAddressOrTxid } from './random-generators'
import { UtxoSeed, Utxo } from '../../src/db/entities/utxo'
import { OrphanSeed, Orphan } from '../../src/db/entities/orphan'
import { Block, BlockSeed } from '../../src/db/entities/block'
import { Flag } from '../../src/db/entities/flag'
import { Follow } from '../../src/db/entities/follow'
import { UserBlock } from '../../src/db/entities/user-block'
import { BorkType } from 'borker-rs-node'

function getUserSeed (block: Block): UserSeed {
  const address = randomAddressOrTxid(true)
  return {
    createdAt: new Date(),
    address,
    block,
    name: address.substr(0, 9),
  }
}

export async function seedBlock (attributes: Partial<BlockSeed> = {}): Promise<Block> {
  const seed: BlockSeed = {
    height: 100,
    hash: 'fakeblockhash',
  }

  const block = getManager().create(Block, Object.assign(seed, attributes))
  return getManager().save(block)
}

export async function seedBaseUser (block: Block, attributes: Partial<UserSeed> = {}): Promise<User> {
  const seed: UserSeed = Object.assign(getUserSeed(block), attributes)

  const user = getManager().create(User, seed)
  return getManager().save(user)
}

export async function seedFullUser (block: Block, attributes: Partial<UserSeed> = {}): Promise<User> {
  const seed: UserSeed = {
    ...getUserSeed(block),
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

export async function seedPost (sender: User, block: Block, attributes: Partial<PostSeed> = {}): Promise<Post> {
  const seed: PostSeed = {
    createdAt: new Date(),
    txid: randomAddressOrTxid(false),
    nonce: 0,
    position: 0,
    type: BorkType.Bork,
    content: 'post content',
    sender,
    block,
  }

  const post = getManager().create(Post, Object.assign(seed, attributes))

  return getManager().save(post)
}

export async function seedOrphan (sender: User, referencePost: Post, block: Block, attributes: Partial<OrphanSeed> = {}): Promise<Orphan> {
  const seed: OrphanSeed = {
    createdAt: new Date(),
    txid: randomAddressOrTxid(false),
    type: BorkType.Comment,
    content: 'post content',
    sender,
    block,
    referenceId: referencePost.txid.substring(0, 1),
    referenceSenderAddress: referencePost.senderAddress,
  }

  const post = getManager().create(Orphan, Object.assign(seed, attributes))

  return getManager().save(post)
}

export async function seedFlag (user: User, post: Post, block: Block): Promise<void> {
  await getManager().createQueryBuilder()
    .insert()
    .into(Flag)
    .values({ user, post, block })
    .execute()
}

export async function seedFollow (follower: User, followed: User, block: Block): Promise<void> {
  await getManager().createQueryBuilder()
    .insert()
    .into(Follow)
    .values({ follower, followed, block })
    .execute()
}

export async function seedUserBlock (blocker: User, blocked: User, block: Block): Promise<void> {
  await getManager().createQueryBuilder()
    .insert()
    .into(UserBlock)
    .values({ blocker, blocked, block })
    .execute()
}
