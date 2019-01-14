import {
	Column,
	CreateDateColumn,
	Entity,
	ManyToOne,
	OneToMany,
	PrimaryColumn,
	JoinColumn,
} from "typeorm"
import { User } from "./user"

export enum PostType {
	post = 'post',
	reply = 'reply',
	repost = 'repost',
	like = 'like',
	profileUpdate = 'profile_update',
}

@Entity()
export class Post {

	@PrimaryColumn('text', { name: 'txid' })
	txid: string

	@CreateDateColumn({ name: 'created_at' })
	createdAt: Date

	@Column("enum", { name: 'type', enum: PostType })
	type: PostType

	@Column('text', { name: 'content', nullable: true })
	content: string

	@Column('numeric', { name: 'value', nullable: true })
	value: string

	@Column('numeric', { name: 'fee' })
	fee: string

	@OneToMany(() => Post, post => post.parent)
	children: Post[]

	@ManyToOne(() => Post, post => post.children, { nullable: true })
	@JoinColumn({ name: 'parent_txid' })
	parent: Post

	@ManyToOne(() => User, user => user.posts)
	@JoinColumn({ name: 'sender_address' })
	sender: User

	@ManyToOne(() => User, user => user.mentions, { nullable: true })
	@JoinColumn({ name: 'recipient_address' })
	recipient: User
}

export interface PostSeed {
  txid: string
  createdAt?: Date
  type: PostType
  content: string
  value: number
  fee: number
}