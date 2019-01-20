import {
	Column,
	Entity,
	OneToMany,
	PrimaryColumn,
  JoinTable,
  ManyToMany,
} from "typeorm"
import { Transaction } from "./transaction"

@Entity({ name: 'users' })
export class User {

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

	@Column('text', { name: 'avatar_link', nullable: true })
  avatarLink: string | null

	@OneToMany(() => Transaction, transaction => transaction.sender)
	sentTransactions: Transaction[]

	@OneToMany(() => Transaction, transaction => transaction.recipient)
  receivedTransactions: Transaction[]

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
