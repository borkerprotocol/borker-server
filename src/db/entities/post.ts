import {
	Column,
  Entity,
	ManyToOne,
	OneToMany,
	PrimaryColumn,
	JoinColumn,
  ManyToMany,
  RelationId,
  Index,
} from 'typeorm'
import { User } from './user'
import { Tag } from './tag'
import { BorkType } from 'borker-rs-node'
import { Block } from './block'
import { PostTag } from './post-tag'
import { Like } from './like'
import { Flag } from './flag'
import { Mention } from './mention'

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

  @OneToMany(() => PostTag, postTag => postTag.post)
  postTags: PostTag[]

  @OneToMany(() => Like, like => like.post)
  likes: Like[]

	@OneToMany(() => Flag, flag => flag.post)
  flags: Flag[]

  @ManyToMany(() => Mention, mention => mention.post)
  mentions: Mention[]

  @Index()
  @ManyToOne(() => Block, block => block.posts, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'block_height' })
  block: Block
  @RelationId((post: Post) => post.block)
  blockHeight: string

  @Index()
  @ManyToOne(() => Post, post => post.children, { nullable: true })
  @JoinColumn({ name: 'parent_txid' })
  parent: Post
  @RelationId((post: Post) => post.parent)
  parentTxid: string

  @Index()
  @ManyToOne(() => User, user => user.posts, { onDelete: 'CASCADE' })
	@JoinColumn({ name: 'sender_address' })
  sender: User
  @RelationId((post: Post) => post.sender)
  senderAddress: string
}

export interface PostSeed {
  txid: string
  createdAt: Date
  nonce: number
  position?: number
  type: BorkType
  sender: User
  block: Block
  content?: string
  parent?: Post
}

export interface PostWithParentSeed extends PostSeed {
  parent: Post
}
