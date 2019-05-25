import {
	Column,
  Entity,
	ManyToOne,
	PrimaryColumn,
	JoinColumn,
  RelationId,
  OneToOne,
} from 'typeorm'
import { User } from './user'
import { Post } from './post'

@Entity({ name: 'orphans' })
export class Orphan {

  // attributes

	@Column('datetime', { name: 'created_at' })
  createdAt: Date

	@Column('int', { name: 'parent_nonce' })
  parentNonce: number

	@Column('int', { name: 'skip' })
	skip: number

  // relations

  @PrimaryColumn('text', { name: 'post_txid' })
  postTxid: string
  @JoinColumn({ name: 'post_txid' })
  @OneToOne(() => Post, post => post.orphan)
  post: Post

  @ManyToOne(() => User, user => user.orphans)
  @JoinColumn({ name: 'parent_sender_address' })
  parentSender: User
  @RelationId((orphan: Orphan) => orphan.parentSender)
  parentSenderAddress: string
}

export interface OrphanSeed {
  createdAt: Date
  parentNonce: number
  skip: number
  post: Post
  parentSender: User
}
