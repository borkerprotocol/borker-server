import {
	Column,
  Entity,
	ManyToOne,
	OneToMany,
	PrimaryColumn,
	JoinColumn,
  ManyToMany,
} from 'typeorm'
import { User } from './user'
import { Tag } from './tag'
import { BigNumber } from 'bignumber.js'
import { BigNumberTransformer } from '../../util/transformers'
import { Mention } from './mention'

export enum TransactionType {
  block = 'block',
  bork = 'bork',
  comment = 'comment',
  extension = 'extension',
  follow = 'follow',
  like = 'like',
  rebork = 'rebork',
  setName = 'set_name',
  setBio = 'set_bio',
  setAvatar = 'set_avatar',
  unblock = 'unblock',
  unfollow = 'unfollow',
}

@Entity({ name: 'transactions' })
export class Transaction {

  // attributes

	@PrimaryColumn('text', { name: 'txid' })
	txid: string

	@Column('datetime', { name: 'created_at' })
  createdAt: Date
  
	@Column('int', { name: 'nonce' })
	nonce: number

	@Column('text', { name: 'type' })
  type: TransactionType

	@Column('text', { name: 'content', nullable: true })
	content: string | null

	@Column('numeric', { name: 'fee', transformer: BigNumberTransformer })
  fee: BigNumber

	@Column('int', { name: 'comments_count', default: 0 })
  commentsCount: number

	@Column('int', { name: 'likes_count', default: 0 })
  likesCount: number

	@Column('int', { name: 'reborks_count', default: 0 })
  reborksCount: number

	@Column('numeric', { name: 'earnings', transformer: BigNumberTransformer, default: 0 })
  earnings: BigNumber

  // relations

  @OneToMany(() => Transaction, transaction => transaction.parent)
  children: Transaction[]

  @ManyToOne(() => Transaction, transaction => transaction.children, { cascade: ['update'], nullable: true })
  @JoinColumn({ name: 'parent_txid' })
  parent: Transaction

	@ManyToOne(() => User, user => user.sentTransactions, { cascade: ['insert', 'update'] })
	@JoinColumn({ name: 'sender_address' })
	sender: User

  @OneToMany(() => Mention, mention => mention.transaction, { cascade: ['insert', 'update'] })
  mentions: Mention[]

  @ManyToMany(() => Tag, tag => tag.transactions, { cascade: ['insert'] })
  tags: Tag[]
}

export interface TxSeed {
  txid: string
  createdAt: Date
  nonce: number
  type: TransactionType
  fee: BigNumber
  sender: User
  mentions: Mention[]
}

export interface BorkTxSeed extends TxSeed {
  content: string
  tags?: Tag[]
  commentsCount?: number
  likesCount?: number
  reborksCount?: number
}

export interface ExtensionTxSeed extends BorkTxSeed {
  parent: Transaction
}

export interface CommentTxSeed extends TxSeed {
  parent: Transaction
  content: string
  tags?: Tag[]
  commentsCount?: number
  likesCount?: number
  reborksCount?: number
}

export interface ReborkTxSeed extends TxSeed {
  parent: Transaction
  tags?: Tag[]
  content?: string
  commentsCount?: number
  likesCount?: number
  reborksCount?: number
}

export interface LikeTxSeed extends TxSeed {
  parent: Transaction
}

export interface ProfileTxSeed extends TxSeed {
  content: string
}

export interface FollowTxSeed extends TxSeed {
  content: string
}

export interface UnfollowTxSeed extends TxSeed {
  content: string
}

export interface BlockTxSeed extends TxSeed {
  content: string
}

export interface UnblockTxSeed extends TxSeed {
  content: string
}
