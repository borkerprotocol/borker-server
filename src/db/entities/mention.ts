import {
	Column,
	Entity,
  ManyToOne,
  JoinColumn,
  PrimaryColumn,
} from 'typeorm'
import { Transaction } from './transaction'
import { User } from './user'
import { BigNumberTransformer } from '../../util/transformers'
import BigNumber from 'bignumber.js'

@Entity({ name: 'mentions' })
export class Mention {

  // attributes

  @PrimaryColumn('text', { name: 'transaction_txid' })
  transactionTxid: string

  @PrimaryColumn('text', { name: 'user_address' })
  userAddress: string

	@Column('datetime', { name: 'created_at' })
  createdAt: Date

	@Column('numeric', { name: 'value', transformer: BigNumberTransformer })
	value: BigNumber

  // relations

  @ManyToOne(() => Transaction, transaction => transaction.mentions)
  @JoinColumn({ name: 'transaction_txid' })
  transaction: Transaction

  @ManyToOne(() => User, user => user.mentions, { cascade: ['update'] })
  @JoinColumn({ name: 'user_address' })
  user: User
}

export interface MentionSeed {
  createdAt: string
  value: string
  transaction: Transaction
  user: User
}
