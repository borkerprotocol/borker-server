import {
	Entity,
	PrimaryColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm'
import { Post } from './post'
import { Tag } from './tag'
import { Block } from './block'

@Entity({ name: 'post_tags' })
export class PostTag {

  // relations

  @PrimaryColumn({ name: 'post_txid' })
  postTxid: string
  @ManyToOne(() => Post, post => post.postTags, { primary: true, onDelete: 'CASCADE' })
	@JoinColumn({ name: 'post_txid' })
  post: Post

  @PrimaryColumn({ name: 'tag_name' })
  tagName: string
  @ManyToOne(() => Tag, tag => tag.postTags, { primary: true, onDelete: 'CASCADE' })
	@JoinColumn({ name: 'tag_name' })
  tag: Tag

  @PrimaryColumn({ name: 'block_height' })
  blockHeight: number
  @ManyToOne(() => Block, block => block.postTags, { primary: true, onDelete: 'CASCADE' })
	@JoinColumn({ name: 'block_height' })
  block: Block
}
