import {
	Column,
  Entity,
	ManyToOne,
	OneToMany,
	PrimaryColumn,
	JoinColumn,
  ManyToMany,
  RelationId,
  OneToOne,
  Index,
} from 'typeorm'
import { User } from './user'
import { Tag } from './tag'
import { BorkType } from 'borker-rs-node'

@Entity({ name: 'posts' })
export class Post {

  // attributes

	@PrimaryColumn('text', { name: 'txid' })
	txid: string

  @Index()
	@Column('datetime', { name: 'created_at' })
  createdAt: Date

	@Column('datetime', { name: 'deleted_at', nullable: true })
  deletedAt: Date | null

	@Column('int', { name: 'nonce' })
  nonce: number

  @Index()
	@Column('int', { name: 'position' })
  position: number

  @Index()
	@Column('text', { name: 'type' })
  type: BorkType

	@Column('text', { name: 'content', nullable: true })
  content: string | null

  // relations

  @OneToMany(() => Post, post => post.parent)
  children: Post[]

  @Index()
  @ManyToOne(() => Post, post => post.children, { nullable: true })
  @JoinColumn({ name: 'parent_txid' })
  parent: Post
  @RelationId((post: Post) => post.parent)
  parentTxid: string

  @Index()
  @ManyToOne(() => User, user => user.posts)
	@JoinColumn({ name: 'sender_address' })
  sender: User
  @RelationId((post: Post) => post.sender)
  senderAddress: string

  @ManyToMany(() => User, user => user.likes)
  likes: User[]

  @ManyToMany(() => User, user => user.flags)
  flags: User[]

  @ManyToMany(() => Tag, tag => tag.posts)
  tags: Tag[]

  @ManyToMany(() => User, user => user.mentions)
  mentions: User[]
}

export interface PostSeed {
  txid: string
  createdAt: Date
  nonce: number
  type: BorkType
  sender: User
  content?: string
  flags?: User[]
  tags?: Tag[]
  mentions?: User[]
}

export interface PostWithParentSeed extends PostSeed {
  parent: Post
}
