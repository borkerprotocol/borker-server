import {
	Column,
  Entity,
	ManyToOne,
	JoinColumn,
  PrimaryColumn,
} from 'typeorm'
import { User } from './user'

@Entity({ name: 'orphans_likes' })
export class OrphanLike {

  // attributes

	@Column('datetime', { name: 'created_at' })
  createdAt: Date

  @PrimaryColumn('text', { name: 'reference_id' })
  referenceId: string

  // relations

  @PrimaryColumn('text', { name: 'sender_address' })
  senderAddress: string
  @JoinColumn({ name: 'sender_address' })
  @ManyToOne(() => User, user => user.orphansLikeOut)
  sender: User

  @PrimaryColumn('text', { name: 'parent_sender_address' })
  parentSenderAddress: string
  @JoinColumn({ name: 'parent_sender_address' })
  @ManyToOne(() => User, user => user.orphansLikeIn)
  parentSender: User
}

export interface OrphanLikeSeed {
  createdAt: Date
  referenceId: string
  sender: User
  parentSender: User
}
