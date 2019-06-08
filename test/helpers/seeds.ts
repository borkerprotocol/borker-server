import { getManager } from 'typeorm'
import { UserSeed, User } from '../../src/db/entities/user'
import { Bork, BorkSeed } from '../../src/db/entities/bork'
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

export async function seedBork (sender: User, attributes: Partial<BorkSeed> = {}): Promise<Bork> {
  const seed: BorkSeed = {
    createdAt: new Date(),
    txid: randomAddressOrTxid(false),
    nonce: 0,
    position: 0,
    type: BorkType.Bork,
    content: 'bork content',
    sender,
  }

  const bork = getManager().create(Bork, Object.assign(seed, attributes))

  return getManager().save(bork)
}

export async function seedOrphan (sender: User, attributes: Partial<OrphanSeed> = {}): Promise<Orphan> {
  const seed: OrphanSeed = {
    createdAt: new Date(),
    txid: randomAddressOrTxid(false),
    blockHeight: 100,
    nonce: 45,
    position: 1,
    content: 'orphan content',
    sender,
  }

  const bork = getManager().create(Orphan, Object.assign(seed, attributes))

  return getManager().save(bork)
}

export async function seedLikeFlag (sender: User, bork: Bork, type: BorkType.Like | BorkType.Flag): Promise<Bork> {
  return seedBork(sender, {
    nonce: null,
    position: null,
    type,
    content: null,
    parent: bork,
    recipient: { address: bork.senderAddress },
  })
}

export async function seedFollowBlock (sender: User, recipient: User, type: BorkType.Follow | BorkType.Block): Promise<Bork> {
  return seedBork(sender, {
    nonce: null,
    position: null,
    type,
    content: null,
    recipient,
  })
}
