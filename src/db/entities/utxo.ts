import {
	Column,
	Entity,
	PrimaryColumn,
  Index,
} from 'typeorm'

@Entity({ name: 'utxos' })
export class Utxo {

  // attributes

	@PrimaryColumn('text', { name: 'txid' })
  txid: string

	@PrimaryColumn('int', { name: 'position' })
  position: number

  @Index()
	@Column('bigint', { name: 'block_height' })
	blockHeight: number

  @Index()
	@Column('text', { name: 'address' })
  address: string

	@Column('bigint', { name: 'value' })
  value: number

	@Column('text', { name: 'raw' })
	raw: string
}

export interface UtxoSeed {
  txid: string
  position: number
  address: string
  value: number
  raw: string
}
