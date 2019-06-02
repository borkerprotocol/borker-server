import {
	Column,
	Entity,
	OneToMany,
	PrimaryColumn,
  Index,
  ManyToOne,
  JoinColumn,
  RelationId,
} from 'typeorm'
import { Post } from './post'
import { Like } from './like'
import { UserBlock } from './user-block'
import { Follow } from './follow'
import { Flag } from './flag'
import { Mention } from './mention'
import { Block } from './block'
import { Orphan } from './orphan'

@Entity({ name: 'users' })
export class User {

  // attributes

	@PrimaryColumn('text', { name: 'address' })
	address: string

	@Column('datetime', { name: 'created_at' })
  createdAt: Date

	@Column('text', { name: 'name' })
	name: string

	@Column('text', { name: 'bio', nullable: true })
	bio: string | null

	@Column('text', { name: 'avatar_link', nullable: true })
  avatarLink: string | null

  // relations

	@OneToMany(() => Post, post => post.sender)
  posts: Post[]

	@OneToMany(() => Orphan, orphan => orphan.sender)
  orphans: Orphan[]

	@OneToMany(() => Like, like => like.user)
  likes: Like[]

	@OneToMany(() => UserBlock, userBlock => userBlock.blocker)
  blocking: UserBlock[]

	@OneToMany(() => UserBlock, userBlock => userBlock.blocked)
  blockers: UserBlock[]

	@OneToMany(() => Follow, follow => follow.followed)
  following: Follow[]

	@OneToMany(() => Follow, follow => follow.followed)
  followers: Follow[]

	@OneToMany(() => Flag, flag => flag.user)
  flags: Flag[]

	@OneToMany(() => Mention, mention => mention.user)
  mentions: Mention[]

  @Index()
  @ManyToOne(() => Block, block => block.users, { onDelete: 'CASCADE' })
	@JoinColumn({ name: 'block_height' })
  block: Block
  @RelationId((user: User) => user.block)
  blockHeight: string
}

export interface UserSeed {
  address: string
  createdAt: Date
  block: Block
  name: string
  bio?: string
  avatarLink?: string
}
