import {
	Entity,
	PrimaryColumn,
  OneToMany,
  Index,
  ManyToOne,
  JoinColumn,
  RelationId,
} from 'typeorm'
import { Post } from './post'
import { PostTag } from './post-tag'
import { Block } from './block'

@Entity({ name: 'tags' })
export class Tag {

  // attributes

	@PrimaryColumn('text', { name: 'name' })
	name: string

  // relations

  @OneToMany(() => PostTag, postTag => postTag.tag)
  postTags: PostTag[]

  @Index()
  @ManyToOne(() => Block, block => block.posts, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'block_height' })
  block: Block
  @RelationId((post: Post) => post.block)
  blockHeight: string
}

export interface TagSeed {
  name: string
}
