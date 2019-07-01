import { User } from '../db/entities/user'
import { Bork } from '../db/entities/bork'

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

export interface ApiBork extends Bork {
  iComment?: string | null
  iRebork?: string | null
  iLike?: string | null
  iFlag?: string | null
  commentsCount?: number
  reborksCount?: number
  likesCount?: number
  flagsCount?: number
  extensionsCount?: number
}

export interface Utxo {
  txid: string
  position: number
  address: string
  value: number
  raw: string
}

export interface RequestOpts {
  method: string
  url: string
  qs?: object
  body?: object
}

export interface rpcResponse {
  id: number
  result?: string
  error?: string
}
