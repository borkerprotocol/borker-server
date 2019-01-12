import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  ManyToOne,
  PrimaryColumn,
} from "typeorm"
import { User } from "./User"

export enum PostType {
  user = 'post',
  reply = 'reply',
  repost = 'repost',
  like = 'like',
  profileUpdate = 'profile_update',
}

@Entity()
export class Post {

  @PrimaryColumn('text', { name: 'txid' })
  txid: string

  @CreateDateColumn( { name: 'created_at' })
  createdAt: string

  @Index()
  @Column('text', { name: 'ref_txid', nullable: true })
  refTxid: string

  @Column("enum", { name: 'type', enum: PostType })
  type: PostType

  @Column('text', { name: 'content', nullable: true })
  content: string

  @Column('numeric', { name: 'value', nullable: true })
  value: string

  @Column('numeric', { name: 'fee' })
  fee: string

  @ManyToOne(() => User, user => user.posts)
  sender: User

  @ManyToOne(() => User, user => user.tips, { nullable: true })
  receipient: User
}
