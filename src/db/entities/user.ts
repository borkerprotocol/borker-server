import {
	Column,
	Entity,
	OneToMany,
	PrimaryColumn,
  JoinTable,
  ManyToMany,
} from 'typeorm'
import { Transaction } from './transaction'
import { BigNumberTransformer } from '../../util/transformers'
import BigNumber from 'bignumber.js'
import { Mention } from './mention'

@Entity({ name: 'users' })
export class User {

  // attributes

	@PrimaryColumn('text', { name: 'address' })
	address: string

	@Column('timestamp', { name: 'created_at' })
  createdAt: Date

	@Column('text', { name: 'name', nullable: true })
	name: string | null

	@Column('text', { name: 'bio', nullable: true })
	bio: string | null

	@Column('int', { name: 'birth_block' })
	birthBlock: number

	@Column('text', { name: 'avatar_link', default: 0 })
  avatarLink: string | null

	@Column('int', { name: 'followers_count', default: 0  })
  followersCount: number | null

	@Column('int', { name: 'following_count', default: 0  })
  followingCount: number | null

	@Column('numeric', { name: 'earnings', transformer: BigNumberTransformer, default: 0 })
  earnings: BigNumber | null

  // relations

	@OneToMany(() => Transaction, transaction => transaction.sender)
	sentTransactions: Transaction[]

  @OneToMany(() => Mention, mention => mention.user)
  mentions: Mention[]

  @ManyToMany(() => User, user => user.following)
  @JoinTable({
    name: 'follows',
    joinColumns: [
      { name: 'followed_address' },
    ],
    inverseJoinColumns: [
      { name: 'follower_address' },
    ],
  })
  followers: User[]

  @ManyToMany(() => User, user => user.followers)
  following: User[]
}

export interface UserSeed {
  address: string
  createdAt: Date
  birthBlock: number
  name?: string
  bio?: string
  avatarLink?: string
}
