import { getManager } from 'typeorm'
import { Bork } from '../db/entities/bork'
import { BorkType } from 'borker-rs-node'

export function NullToUndefined<T> (a: T | null): T | undefined {
  if (a === null) return undefined
  return a
}

export async function checkFollowed (followedAddress: string, followerAddress: string): Promise<boolean> {
  return (await getManager().count(Bork, {
    where: {
      type: BorkType.Follow,
      sender: { address: followerAddress },
      recipient: { address: followedAddress },
    },
  })) > 0
}

export async function checkBlocked (blockedAddress: string, blockerAddress: string): Promise<boolean> {
  return (await getManager().count(Bork, {
    where: {
      type: BorkType.Block,
      sender: { address: blockerAddress },
      recipient: { address: blockedAddress },
    },
  })) > 0
}

export async function eitherPartyBlocked (address1: string, address2: string): Promise<boolean> {
  return (await getManager().count(Bork, {
    where: [
      {
        type: BorkType.Block,
        sender: { address: address1 },
        recipient: { address: address2 },
      },
      {
        type: BorkType.Block,
        sender: { address: address2 },
        recipient: { address: address1 },
      },
    ],
  })) > 0
}

export async function iFollowBlock (myAddress: string, address: string): Promise<{ iFollow: boolean, iBlock: boolean }> {
  const [iFollow, iBlock] = await Promise.all([
    checkFollowed(address, myAddress),
    checkBlocked(address, myAddress),
  ])

  return { iFollow, iBlock }
}
