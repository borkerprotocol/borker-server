import {
	Column,
  Entity,
  PrimaryColumn,
  Index,
  ManyToOne,
  JoinColumn,
  RelationId,
} from 'typeorm'
import { User } from './user'

@Entity({ name: 'orphans' })
export class Orphan {

  // attributes

  @PrimaryColumn('text', { name: 'txid' })
  txid: string

  @Index()
	@Column('datetime', { name: 'created_at' })
  createdAt: Date

  @Index()
	@Column('bigint', { name: 'block_height' })
  blockHeight: number

  @Index()
	@Column('int', { name: 'nonce' })
  nonce: number

  @Index()
	@Column('int', { name: 'position' })
  position: number

	@Column('text', { name: 'content' })
  content: string

  @Column('text', { name: 'mentions', nullable: true })
  mentions: string | null

  @Column('text', { name: 'tags', nullable: true })
  tags: string | null

  // relations

  @Index()
  @ManyToOne(() => User, user => user.orphans)
	@JoinColumn({ name: 'sender_address' })
  sender: User
  @RelationId((orphan: Orphan) => orphan.sender)
  senderAddress: string

}

export interface OrphanSeed {
  txid: string
  createdAt: Date
  blockHeight: number
  sender: User
  nonce: number
  position: number
  content: string
  mentions?: string
}
