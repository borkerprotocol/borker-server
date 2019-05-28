import {
	Column,
  Entity,
	ManyToOne,
	PrimaryColumn,
	JoinColumn,
  RelationId,
  OneToOne,
  Index,
} from 'typeorm'
import { User } from './user'
import { Post } from './post'

@Entity({ name: 'orphans_cr' })
export class OrphanCR {

  // attributes

	@Column('datetime', { name: 'created_at' })
  createdAt: Date

  @Index()
	@Column('text', { name: 'reference_id' })
  referenceId: string

  // relations

  @PrimaryColumn('text', { name: 'post_txid' })
  postTxid: string
  @JoinColumn({ name: 'post_txid' })
  @OneToOne(() => Post, post => post.orphanCR)
  post: Post

  @ManyToOne(() => User, user => user.orphansCR)
  @Index()
  @JoinColumn({ name: 'parent_sender_address' })
  parentSender: User
  @RelationId((orphanCR: OrphanCR) => orphanCR.parentSender)
  parentSenderAddress: string
}

export interface OrphanCRSeed {
  createdAt: Date
  referenceId: string
  postTxid: Post
  parentSenderAddress: User
}
