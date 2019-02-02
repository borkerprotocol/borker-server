import {
	Column,
  Entity,
	ManyToOne,
	OneToMany,
	PrimaryColumn,
	JoinColumn,
} from 'typeorm'
import { User } from './user'
import { BigNumber } from 'bignumber.js'
import { BigNumberTransformer } from '../../util/transformers'

export enum TransactionType {
  bork = 'bork',
  comment = 'comment',
  extension = 'extension',
  follow = 'follow',
  like = 'like',
  rebork = 'rebork',
  setName = 'set_name',
  setBio = 'set_bio',
  setAvatar = 'set_avatar',
  unfollow = 'unfollow',
}

@Entity({ name: 'transactions' })
export class Transaction {

  // attributes

	@PrimaryColumn('text', { name: 'txid' })
	txid: string

	@Column('timestamp', { name: 'created_at' })
  createdAt: Date
  
	@Column('int', { name: 'nonce' })
	nonce: number

	@Column('enum', { name: 'type', enum: TransactionType })
  type: TransactionType

	@Column('text', { name: 'content', nullable: true })
	content: string | null

	@Column('numeric', { name: 'value', transformer: BigNumberTransformer, default: 0 })
	value: BigNumber | null

	@Column('numeric', { name: 'fee', transformer: BigNumberTransformer })
  fee: BigNumber

	@Column('int', { name: 'comments_count', default: 0 })
  commentsCount: number | null

	@Column('int', { name: 'likes_count', default: 0 })
  likesCount: number | null

	@Column('int', { name: 'reborks_count', default: 0 })
  reborksCount: number | null

	@Column('numeric', { name: 'earnings', transformer: BigNumberTransformer, default: 0 })
  earnings: BigNumber | null

  // relations

  @OneToMany(() => Transaction, transaction => transaction.parent)
  children: Transaction[]

  @ManyToOne(() => Transaction, transaction => transaction.children, { cascade: ['update'], nullable: true })
  @JoinColumn({ name: 'parent_txid' })
  parent: Transaction

	@ManyToOne(() => User, user => user.sentTransactions, { cascade: ['insert', 'update'] })
	@JoinColumn({ name: 'sender_address' })
	sender: User

	@ManyToOne(() => User, user => user.receivedTransactions, { cascade: ['update'], nullable: true })
	@JoinColumn({ name: 'recipient_address' })
  recipient: User | null
}

export interface TxSeed {
  txid: string
  createdAt: Date
  nonce: number
  type: TransactionType
  fee: BigNumber
  sender: User
}

export interface BorkTxSeed extends TxSeed {
  content: string
  commentsCount?: number
  likesCount?: number
  reborksCount?: number
}

export interface ExtensionTxSeed extends BorkTxSeed {
  parent: Transaction
  commentsCount?: number
  likesCount?: number
  reborksCount?: number
}

export interface CommentTxSeed extends TxSeed {
  recipient: User
  parent: Transaction
  value: BigNumber
  content: string
  commentsCount?: number
  likesCount?: number
  reborksCount?: number
}

export interface ReborkTxSeed extends TxSeed {
  recipient: User
  parent: Transaction
  value: BigNumber
  content?: string
  commentsCount?: number
  likesCount?: number
  reborksCount?: number
}

export interface LikeTxSeed extends TxSeed {
  recipient: User
  parent: Transaction
  value: BigNumber
}

export interface ProfileTxSeed extends TxSeed {
  content: string
}

export interface FollowTxSeed extends TxSeed {
  content: string
}

export type UnfollowTxSeed = FollowTxSeed
