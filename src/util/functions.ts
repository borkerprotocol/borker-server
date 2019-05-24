import { getManager } from 'typeorm'

export async function checkFollowed (followedAddress: string, followerAddress: string): Promise<boolean> {
  return (await getManager()
    .createQueryBuilder()
    .select()
    .from('follows', 'follows')
    .where('followed_address = :followedAddress', { followedAddress })
    .andWhere('follower_address = :followerAddress', { followerAddress })
    .getCount()
  ) > 0
}

export async function checkBlocked (blockedAddress: string, blockerAddress: string): Promise<boolean> {
  return (await getManager()
    .createQueryBuilder()
    .select()
    .from('blocks', 'blocks')
    .where('blocked_address = :blockedAddress', { blockedAddress })
    .andWhere('blocker_address = :blockerAddress', { blockerAddress })
    .getCount()
  ) > 0
}

export async function eitherPartyBlocked (address1: string, address2: string): Promise<boolean> {
  return (await getManager()
    .createQueryBuilder()
    .select()
    .from('blocks', 'blocks')
    .where('blocked_address = :address1 AND blocker_address = :address2', { address1, address2 })
    .orWhere('blocked_address = :address2 AND blocker_address = :address1', { address2, address1 })
    .getCount()
  ) > 0
}

export async function iFollowBlock (myAddress: string, address: string): Promise<{ iFollow: boolean, iBlock: boolean }> {
  const [iFollow, iBlock] = await Promise.all([
    checkFollowed(address, myAddress),
    checkBlocked(address, myAddress),
  ])

  return { iFollow, iBlock }
}
