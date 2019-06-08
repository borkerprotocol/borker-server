import {
	Column,
	Entity,
	OneToMany,
	PrimaryColumn,
  JoinTable,
  ManyToMany,
  Index,
} from 'typeorm'
import { Bork } from './bork'
import { Orphan } from './orphan'

@Entity({ name: 'users' })
export class User {

  // attributes

	@PrimaryColumn('text', { name: 'address' })
	address: string

	@Column('datetime', { name: 'created_at' })
  createdAt: Date

  @Index()
	@Column('bigint', { name: 'birth_block' })
	birthBlock: number

	@Column('text', { name: 'name' })
	name: string

	@Column('text', { name: 'bio', nullable: true })
	bio: string | null

	@Column('text', { name: 'avatar_link', nullable: true })
  avatarLink: string | null

  // relations

	@OneToMany(() => Bork, bork => bork.sender)
  borks: Bork[]

	@OneToMany(() => Bork, bork => bork.recipient)
  receivedBorks: Bork[]

	@OneToMany(() => Orphan, orphan => orphan.sender)
  orphans: Orphan[]

  @ManyToMany(() => Bork, bork => bork.mentions)
  @JoinTable({
    name: 'mentions',
    joinColumns: [
      { name: 'user_address' },
    ],
    inverseJoinColumns: [
      { name: 'bork_txid' },
    ],
  })
  mentions: Bork[]
}

export interface UserSeed {
  address: string
  createdAt: Date
  birthBlock: number
  name: string
  bio?: string
  avatarLink?: string
}
