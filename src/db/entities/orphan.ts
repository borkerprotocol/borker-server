import {
	Column,
  Entity,
  PrimaryColumn,
  Index,
} from 'typeorm'
import { BorkType } from 'borker-rs-node'

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
  @Column('text', { name: 'sender_address' })
  senderAddress: string

  @Index()
  @Column('text', { name: 'reference_id', nullable: true })
  referenceId: string | null

  @Index()
  @Column('text', { name: 'reference_sender_address', nullable: true })
  referenceSenderAddress: string | null
}

export interface OrphanSeed {
  txid: string
  createdAt: Date
  nonce?: number
  index?: number
  type: BorkType
  content?: string
  senderAddress: string
  referenceId?: string
  referenceSenderAddress?: string
}
