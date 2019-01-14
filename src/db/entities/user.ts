import {
	Column,
	CreateDateColumn,
	Entity,
	OneToMany,
	PrimaryColumn,
} from "typeorm"
import { Post } from "./post"

@Entity()
export class User {

	@PrimaryColumn('text', { name: 'address' })
	address: string

	@CreateDateColumn({ name: 'created_at' })
	createdAt: Date

	@Column('text', { name: 'name', nullable: true })
	name: string

	@Column('text', { name: 'bio', nullable: true })
	bio: string

	@Column('int', { name: 'birth_block' })
	birthBlock: number

	@Column('text', { name: 'avatar_link', nullable: true })
	avatarLink: string

	@OneToMany(() => Post, post => post.sender)
	posts: Post[]

	@OneToMany(() => Post, post => post.recipient)
	mentions: Post[]
}

export interface UserSeed {
  address: string
  createdAt?: Date
  name: string
  bio: string
  birthBlock: number
  avatarLink: string
}
