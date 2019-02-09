import {
	Column,
	Entity,
	PrimaryColumn,
  ManyToMany,
  JoinTable,
} from 'typeorm'
import { Transaction } from './transaction'

@Entity({ name: 'tags' })
export class Tag {

  // attributes

	@PrimaryColumn('text', { name: 'name', unique: true })
	name: string

	@Column('datetime', { name: 'created_at' })
  createdAt: Date

  // relations

  @ManyToMany(() => Transaction, transaction => transaction.tags)
  @JoinTable({
    name: 'tx_tags',
    joinColumns: [
      { name: 'tag_name' },
    ],
    inverseJoinColumns: [
      { name: 'transaction_txid' },
    ],
  })
  transactions: Transaction[]
}

export interface TagSeed {
  tag: string
  createdAt: string
}
