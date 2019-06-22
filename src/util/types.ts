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
