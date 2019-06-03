import {
	Entity,
	PrimaryColumn,
  ManyToMany,
  JoinTable,
} from 'typeorm'
import { Bork } from './bork'

@Entity({ name: 'tags' })
export class Tag {

  // attributes

	@PrimaryColumn('text', { name: 'name' })
	name: string

  // relations

  @ManyToMany(() => Bork, bork => bork.tags)
  @JoinTable({
    name: 'bork_tags',
    joinColumns: [
      { name: 'tag_name' },
    ],
    inverseJoinColumns: [
      { name: 'bork_txid' },
    ],
  })
  borks: Bork[]
}

export interface TagSeed {
  tag: string
  createdAt: string
}
