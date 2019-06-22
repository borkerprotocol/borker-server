import { User } from '../db/entities/user';

export type OrderBy<Entity> = { [P in keyof Entity]?: 'ASC' | 'DESC' }

export interface OrphanBork {
  txid: string
  time: string
  nonce: number
  position: number
  content: string
  mentions: string
  tags: string
  senderAddress: string
  parentTxid: string
}

export interface ApiUser extends User {
  iFollow: string | null
  iBlock: string | null
  followersCount?: number
  followingCount?: number
}

export interface Utxo {
  txid: string
  position: number
  address: string
  value: number
  raw: string
}
