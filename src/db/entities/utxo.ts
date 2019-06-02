import {
	Column,
	Entity,
	PrimaryColumn,
  Index,
  ManyToOne,
  JoinColumn,
  RelationId,
} from 'typeorm'
import { Block } from './block'

@Entity({ name: 'utxos' })
export class Utxo {

  // attributes

	@PrimaryColumn('text', { name: 'txid' })
  txid: string

	@PrimaryColumn('int', { name: 'position' })
	position: number

  @Index()
	@Column('text', { name: 'address' })
  address: string

	@Column('bigint', { name: 'value' })
  value: number

	@Column('text', { name: 'raw' })
  raw: string

  // relations

  @Index()
  @ManyToOne(() => Block, block => block.posts, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'block_height' })
  block: Block
  @RelationId((utxo: Utxo) => utxo.block)
  blockHeight: string
}

export interface UtxoSeed {
  txid: string
  position: number
  address: string
  value: number
  raw: string
}
