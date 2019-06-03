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

	@Column('boolean', { name: 'is_cleaning', nullable: false, default: false })
  isCleaning: boolean
}

export interface TxBlockSeed {
  height: number
  hash: string
  isCLeaning?: boolean
}
