import {
	Entity,
	PrimaryColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm'
import { User } from './user'
import { Block } from './block'

@Entity({ name: 'follows' })
export class Follow {

  // relations

  @PrimaryColumn({ name: 'followed_address' })
  followerAddress: string
  @ManyToOne(() => User, user => user.followers, { primary: true, onDelete: 'CASCADE' })
	@JoinColumn({ name: 'followed_address' })
  follower: User

  @PrimaryColumn({ name: 'following_address' })
  followedAddress: string
  @ManyToOne(() => User, user => user.following, { primary: true, onDelete: 'CASCADE' })
	@JoinColumn({ name: 'following_address' })
  followed: User

  @PrimaryColumn({ name: 'block_height' })
  blockHeight: number
  @ManyToOne(() => Block, block => block.postTags, { primary: true, onDelete: 'CASCADE' })
	@JoinColumn({ name: 'block_height' })
  block: Block
}
