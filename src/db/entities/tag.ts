import {
	Entity,
	PrimaryColumn,
  ManyToMany,
  JoinTable,
} from 'typeorm'
import { Post } from './post'

@Entity({ name: 'tags' })
export class Tag {

  // attributes

	@PrimaryColumn('text', { name: 'name' })
	name: string

  // relations

  @ManyToMany(() => Post, post => post.tags)
  @JoinTable({
    name: 'post_tags',
    joinColumns: [
      { name: 'tag_name' },
    ],
    inverseJoinColumns: [
      { name: 'post_txid' },
    ],
  })
  posts: Post[]
}

export interface TagSeed {
  tag: string
  createdAt: string
}
