import { getManager, getRepository } from "typeorm"
import { TransactionType, Transaction } from "../db/entities/transaction"

export async function iCommentLikeRebork (myAddress: string, tx: Transaction): Promise<{ iComment: boolean, iLike: boolean, iRebork: boolean }> {
  const [comment, like, rebork] = await  Promise.all([
    getRepository(Transaction).findOne({
      sender: { address: myAddress },
      parent: { txid: tx.txid },
      type: TransactionType.comment,
    }),
    getRepository(Transaction).findOne({
      sender: { address: myAddress },
      parent: { txid: tx.txid },
      type: TransactionType.like,
    }),
    getRepository(Transaction).findOne({
      sender: { address: myAddress },
      parent: { txid: tx.txid },
      type: TransactionType.rebork,
    }),
  ])

  return {
    iComment: !!comment,
    iLike: !!like,
    iRebork: !!rebork,
  }
}

export async function iFollow (myAddress: string, address: string): Promise<boolean> {
  return (await getManager().query(
    'SELECT EXISTS (SELECT 1 FROM follows WHERE follower_address = $1 AND followed_address = $2);',
    [myAddress, address],
  ))[0].exists
}