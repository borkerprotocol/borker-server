import {
	Column,
	Entity,
	OneToMany,
	PrimaryColumn,
  JoinTable,
  ManyToMany,
  Index,
} from 'typeorm'
import { Post } from './post'
import { OrphanCR } from './orphan-cr'
import { OrphanLike } from './orphan-like'

@Entity({ name: 'users' })
export class User {

  // attributes

	@PrimaryColumn('text', { name: 'address' })
	address: string

	@Column('datetime', { name: 'created_at' })
  createdAt: Date

  @Index()
	@Column('int', { name: 'birth_block' })
	birthBlock: number

	@Column('text', { name: 'name' })
	name: string

	@Column('text', { name: 'bio', nullable: true })
	bio: string | null

	@Column('text', { name: 'avatar_link', nullable: true })
  avatarLink: string | null

  // relations

	@OneToMany(() => Post, post => post.sender)
  posts: Post[]

	@OneToMany(() => OrphanCR, orphanCR => orphanCR.parentSender)
  orphansCR: OrphanCR[]

	@OneToMany(() => OrphanLike, orphanLike => orphanLike.sender)
  orphansLikeOut: OrphanLike[]

	@OneToMany(() => OrphanLike, orphanLike => orphanLike.parentSender)
  orphansLikeIn: OrphanLike[]

  @ManyToMany(() => User, user => user.following)
  @JoinTable({
    name: 'follows',
    joinColumns: [
      { name: 'followed_address' },
    ],
    inverseJoinColumns: [
      { name: 'follower_address' },
    ],
  })
  followers: User[]

  @ManyToMany(() => User, user => user.followers)
  following: User[]

  @ManyToMany(() => User, user => user.blocking)
  @JoinTable({
    name: 'blocks',
    joinColumns: [
      { name: 'blocked_address' },
    ],
    inverseJoinColumns: [
      { name: 'blocker_address' },
    ],
  })
  blockers: User[]

  @ManyToMany(() => User, user => user.blockers)
  blocking: User[]

  @ManyToMany(() => Post, post => post.likes)
  @JoinTable({
    name: 'likes',
    joinColumns: [
      { name: 'user_address' },
    ],
    inverseJoinColumns: [
      { name: 'post_txid' },
    ],
  })
  likes: Post[]

  @ManyToMany(() => Post, post => post.flags)
  @JoinTable({
    name: 'flags',
    joinColumns: [
      { name: 'user_address' },
    ],
    inverseJoinColumns: [
      { name: 'post_txid' },
    ],
  })
  flags: Post[]

  @ManyToMany(() => Post, post => post.mentions)
  @JoinTable({
    name: 'mentions',
    joinColumns: [
      { name: 'user_address' },
    ],
    inverseJoinColumns: [
      { name: 'post_txid' },
    ],
  })
  mentions: Post[]
}

export interface UserSeed {
  address: string
  createdAt: Date
  birthBlock: number
  name: string
  bio?: string
  avatarLink?: string
}
