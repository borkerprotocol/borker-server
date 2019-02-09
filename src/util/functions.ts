import { getManager } from "typeorm"

export async function checkFollowing (myAddress: string, address: string): Promise<boolean> {
  return (await getManager()
    .createQueryBuilder()
    .select()
    .from('follows', 'follows')
    .where('follower_address = :myAddress', { myAddress })
    .andWhere('followed_address = :address', { address })
    .getCount()
  ) > 0
}

export async function checkBlocked (myAddress: string, address: string): Promise<boolean> {
  return (await getManager()
    .createQueryBuilder()
    .select()
    .from('blocks', 'blocks')
    .where('blocked_address = :myAddress', { myAddress })
    .andWhere('blocker_address = :address', { address })
    .getCount()
  ) > 0
}
