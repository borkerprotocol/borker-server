import {
	Column,
  Entity,
  PrimaryColumn,
  Index,
  ManyToOne,
  JoinColumn,
  RelationId,
} from 'typeorm'
import { BorkType } from 'borker-rs-node'
import { Block } from './block'
import { User } from './user'

@Entity({ name: 'orphans' })
export class Orphan {

  // attributes

  @PrimaryColumn('text', { name: 'txid' })
  txid: string

  @Index()
	@Column('datetime', { name: 'created_at' })
  createdAt: Date

	@Column('int', { name: 'nonce', nullable: true })
  nonce: number | null

  @Index()
	@Column('int', { name: 'position', nullable: true })
  position: number | null

  @Index()
	@Column('text', { name: 'type' })
  type: BorkType

	@Column('text', { name: 'content', nullable: true })
  content: string | null

  @Index()
  @Column('text', { name: 'reference_id', nullable: true })
  referenceId: string | null

  @Index()
  @Column('text', { name: 'reference_sender_address', nullable: true })
  referenceSenderAddress: string | null

  @Column('text', { name: 'mentions', nullable: true })
  mentions: string | null

  // relations

  @Index()
  @ManyToOne(() => User, user => user.orphans, { onDelete: 'CASCADE' })
	@JoinColumn({ name: 'sender_address' })
  sender: User
  @RelationId((orphan: Orphan) => orphan.sender)
  senderAddress: string

  @Index()
  @ManyToOne(() => Block, block => block.posts, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'block_height' })
  block: Block
  @RelationId((orphan: Orphan) => orphan.block)
  blockHeight: string
}

export interface OrphanSeed {
  txid: string
  createdAt: Date
  type: BorkType
  sender: User
  block: Block
  nonce?: number
  position?: number
  content?: string
  referenceId?: string
  referenceSenderAddress?: string
  mentions?: string
}
