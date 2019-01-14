import { getManager } from 'typeorm'
import { UserSeed, User } from '../../src/db/entities/user'
import { Post, PostSeed, PostType } from '../../src/db/entities/post'
import { randomAddressOrTxid } from './random-generators'

export async function seedUser (attributes: Partial<UserSeed> = {}) {
  const defaultSeed: UserSeed = {
    address: randomAddressOrTxid(),
    birthBlock: Math.floor(Math.random() * 2000001),
    name: '',
    bio: '',
    avatarLink: '',
  }
  const seed: UserSeed = Object.assign(defaultSeed, attributes)
  const user = getManager().create(User, seed)
  return getManager().save(user)
}

export async function seedPost (sender: User, recipient?: User, parent?: Post, attributes: Partial<UserSeed> = {}) {
  const defaultSeed: PostSeed = {
    txid: randomAddressOrTxid(false),
    type: PostType.post,
    content: 'hello',
    value: 0,
    fee: 1,
  }
  const seed = Object.assign(defaultSeed, attributes)
  const post = getManager().create(Post, seed)
  post.sender = sender
  post.recipient = recipient
  post.parent = parent
  return getManager().save(post)
}