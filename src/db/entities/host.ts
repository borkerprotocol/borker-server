import {
	Entity,
	PrimaryColumn,
  Column,
  Index,
  CreateDateColumn,
} from 'typeorm'
import { HostType } from '../../util/types'

@Entity({ name: 'hosts' })
export class Host {

  // attributes

	@PrimaryColumn('text', { name: 'url' })
  url: string

	@CreateDateColumn({ name: 'created_at' })
  createdAt: Date

  @Index()
	@Column('datetime', { name: 'last_graduated', nullable: true })
  lastGraduated: Date | null

  @Index()
	@Column('text', { name: 'type' })
  type: HostType

	@Column('int', { name: 'priority', default: 0 })
  priority: number
}
