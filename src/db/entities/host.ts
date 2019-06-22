import {
	Entity,
	PrimaryColumn,
  Column,
  Index,
} from 'typeorm'
import { HostType } from '../../util/types'

@Entity({ name: 'hosts' })
export class Host {

  // attributes

	@PrimaryColumn('text', { name: 'url' })
  url: string

  @Index()
	@Column('datetime', { name: 'last_used' })
  lastUsed: Date

  @Index()
	@Column('text', { name: 'type' })
  type: HostType
}
