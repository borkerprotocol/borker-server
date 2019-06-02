import {
	Entity,
	PrimaryColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm'
import { Post } from './post'
import { User } from './user'
import { Block } from './block'

@Entity({ name: 'mentions' })
export class Mention {

  // relations

  @PrimaryColumn({ name: 'post_txid' })
  postTxid: string
  @ManyToOne(() => Post, post => post.likes, { primary: true, onDelete: 'CASCADE' })
	@JoinColumn({ name: 'post_txid' })
  post: Post

  @PrimaryColumn({ name: 'user_address' })
  userAddress: string
  @ManyToOne(() => User, user => user.likes, { primary: true, onDelete: 'CASCADE' })
	@JoinColumn({ name: 'user_address' })
  user: User

  @PrimaryColumn({ name: 'block_height' })
  blockHeight: number
  @ManyToOne(() => Block, block => block.postTags, { primary: true, onDelete: 'CASCADE' })
	@JoinColumn({ name: 'block_height' })
  block: Block
}
