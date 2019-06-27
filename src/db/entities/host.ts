import {
  Entity,
  PrimaryColumn,
  Column,
  Index,
  CreateDateColumn,
} from 'typeorm'

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

  @Column('int', { name: 'priority' })
  priority: number
}
