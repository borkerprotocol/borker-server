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

@Entity({ name: 'borks' })
export class Bork {

  // attributes

	@PrimaryColumn('text', { name: 'txid' })
	txid: string

  @Index()
	@Column('datetime', { name: 'created_at' })
  createdAt: Date

	@Column('datetime', { name: 'deleted_at', nullable: true })
  deletedAt: Date | null

  @Index()
	@Column('text', { name: 'type' })
  type: BorkType

  @Index()
	@Column('int', { name: 'nonce', nullable: true })
  nonce: number | null

  @Index()
	@Column('int', { name: 'position', nullable: true })
  position: number | null

	@Column('text', { name: 'content', nullable: true })
  content: string | null

  // relations

  @OneToMany(() => Bork, bork => bork.parent)
  children: Bork[]

  @Index()
  @ManyToOne(() => User, user => user.borks)
	@JoinColumn({ name: 'sender_address' })
  sender: User
  @RelationId((bork: Bork) => bork.sender)
  senderAddress: string

  @Index()
  @ManyToOne(() => Bork, bork => bork.children, { nullable: true })
  @JoinColumn({ name: 'parent_txid' })
  parent: Bork | null
  @RelationId((bork: Bork) => bork.parent)
  parentTxid: string | null

  @Index()
  @ManyToOne(() => User, user => user.receivedBorks, { nullable: true })
	@JoinColumn({ name: 'recipient_address' })
  recipient: User | null
  @RelationId((bork: Bork) => bork.recipient)
  recipientAddress: string | null

  @ManyToMany(() => Tag, tag => tag.borks)
  tags: Tag[]

  @ManyToMany(() => User, user => user.mentions)
  mentions: User[]
}

export interface BorkSeed {
  txid: string
  createdAt: Date
  type: BorkType
  sender: User
  deletedAt?: Date | null
  nonce?: number | null
  position?: number | null
  content?: string | null
  parent?: Partial<Bork> | null
  recipient?: Partial<User> | null
}
