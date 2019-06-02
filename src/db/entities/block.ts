import {
	Column,
	Entity,
	PrimaryColumn,
  Index,
  OneToMany,
} from 'typeorm'
import { Post } from './post'
import { Orphan } from './orphan'
import { PostTag } from './post-tag'
import { User } from './user'
import { Flag } from './flag'
import { Follow } from './follow'
import { Like } from './like'
import { Mention } from './mention'
import { Tag } from './tag'
import { UserBlock } from './user-block'
import { Utxo } from './utxo'

@Entity({ name: 'blocks' })
export class Block {

  // attributes

	@PrimaryColumn('bigint', { name: 'height' })
  height: number

  @Index()
	@Column('text', { name: 'hash', nullable: false, unique: true })
  hash: string

  // relations

  @OneToMany(() => Flag, flag => flag.block)
  flags: Flag[]

  @OneToMany(() => Follow, follow => follow.block)
  follows: Follow[]

  @OneToMany(() => Like, like => like.block)
  likes: Like[]

  @OneToMany(() => Mention, mention => mention.block)
  mentions: Mention[]

  @OneToMany(() => Orphan, orphan => orphan.block)
  orphans: Orphan[]

  @OneToMany(() => PostTag, postTag => postTag.block)
  postTags: PostTag[]

  @OneToMany(() => Post, post => post.block)
  posts: Post[]

  @OneToMany(() => Tag, tag => tag.block)
  tags: Tag[]

  @OneToMany(() => UserBlock, userBlock => userBlock.block)
  userBlocks: UserBlock[]

  @OneToMany(() => User, user => user.block)
  users: User[]

  @OneToMany(() => Utxo, utxo => utxo.block)
  utxos: Utxo[]
}

export interface BlockSeed {
  height: number
  hash: string
}
