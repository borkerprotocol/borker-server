import {
	Column,
	Entity,
	PrimaryColumn,
  Index,
} from 'typeorm'

@Entity({ name: 'tx_blocks' })
export class TxBlock {

  // attributes

	@PrimaryColumn('bigint', { name: 'height' })
  height: number

  @Index()
	@Column('text', { name: 'hash', nullable: false, unique: true })
  hash: string
}

export interface TxBlockSeed {
  height: number
  hash: string
}
