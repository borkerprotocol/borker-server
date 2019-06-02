import {
	Entity,
	PrimaryColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm'
import { User } from './user'
import { Block } from './block'

@Entity({ name: 'user_blocks' })
export class UserBlock {

  // relations

  @PrimaryColumn({ name: 'blocker_address' })
  blockerAddress: string
  @ManyToOne(() => User, user => user.blockers, { primary: true, onDelete: 'CASCADE' })
	@JoinColumn({ name: 'blocker_address' })
  blocker: User

  @PrimaryColumn({ name: 'blocked_address' })
  blockedAddress: string
  @ManyToOne(() => User, user => user.blocking, { primary: true, onDelete: 'CASCADE' })
	@JoinColumn({ name: 'blocked_address' })
  blocked: User

  @PrimaryColumn({ name: 'block_height' })
  blockHeight: number
  @ManyToOne(() => Block, block => block.postTags, { primary: true, onDelete: 'CASCADE' })
	@JoinColumn({ name: 'block_height' })
  block: Block
}
