import { getManager } from "typeorm"

export async function iFollow (myAddress: string, address: string): Promise<boolean> {
  return (await getManager().query(
    'SELECT EXISTS (SELECT 1 FROM follows WHERE follower_address = $1 AND followed_address = $2);',
    [myAddress, address],
  ))[0].exists
}