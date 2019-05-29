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

@Entity({ name: 'orphans_comments_reborks' })
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

  @Index()
  @ManyToOne(() => User, user => user.orphansCR)
  @JoinColumn({ name: 'parent_sender_address' })
  parentSender: User
  @RelationId((orphanCR: OrphanCR) => orphanCR.parentSender)
  parentSenderAddress: string
}

export interface OrphanCRSeed {
  createdAt: Date
  referenceId: string
  post: Post
  parentSender: User
}
