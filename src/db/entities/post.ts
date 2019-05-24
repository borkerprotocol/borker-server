import {
	Column,
  Entity,
	ManyToOne,
	OneToMany,
	PrimaryColumn,
	JoinColumn,
  ManyToMany,
} from 'typeorm'
import { User } from './user'
import { Tag } from './tag'

export enum PostType {
  bork = 'bork',
  comment = 'comment',
  like = 'like',
  extension = 'extension',
}

@Entity({ name: 'posts' })
export class Post {

  // attributes

	@PrimaryColumn('text', { name: 'txid' })
	txid: string

	@Column('datetime', { name: 'created_at' })
  createdAt: Date

	@Column('int', { name: 'nonce' })
	nonce: number

	@Column('text', { name: 'type' })
  type: PostType

	@Column('text', { name: 'content', nullable: true })
	content: string | null

  // relations

  @OneToMany(() => Post, post => post.parent)
  children: Post[]

  @ManyToOne(() => Post, post => post.children, { nullable: true })
  @JoinColumn({ name: 'parent_txid' })
  parent: Post

	@ManyToOne(() => User, user => user.posts)
	@JoinColumn({ name: 'sender_address' })
  sender: User

  @ManyToMany(() => User, user => user.flags)
  flags: User[]

  @ManyToMany(() => User, user => user.mentions)
  mentions: User[]

  @ManyToMany(() => Tag, tag => tag.posts)
  tags: Tag[]
}

export interface PostSeed {
  txid: string
  createdAt: Date
  nonce: number
  type: PostType
  sender: User
  content?: string
  tags?: Tag[]
  likes?: User[]
  mentions?: User[]
}

export interface PostTxWithParentSeed extends PostSeed {
  parent: Post
}
