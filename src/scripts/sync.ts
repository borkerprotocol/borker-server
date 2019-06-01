import * as rpc from '../util/rpc-requests'
import * as fs from 'fs'
import { getManager, EntityManager, Like, Not, MoreThan } from 'typeorm'
import { Post } from '../db/entities/post'
import { User } from '../db/entities/user'
import { Tag } from '../db/entities/tag'
import { Utxo } from '../db/entities/utxo'
import { eitherPartyBlocked, chunks } from '../util/functions'
import { processBlock, Network, BorkType, BorkTxData, UtxoId, NewUtxo } from 'borker-rs-node'
import { Orphan } from '../db/entities/orphan'
// import { getMockBorkerTxs, getMockCreated, getMockSpent } from '../util/mocks'
import { TxBlock } from '../db/entities/tx-block'

let config = JSON.parse(fs.readFileSync('borkerconfig.json', 'utf8'))
let blockHeight: number

export async function syncChain () {
  console.log('begin sync')
  let block = await getManager().findOne(TxBlock, { order: { height: 'DESC' } })

  let keepGoing = true
  do {
    if (block) {
      const blockHash = await rpc.getBlockHash(block.height)
      if (blockHash !== block.hash) {
        blockHeight = block.height - 6
        console.log(`block ${block.height} hash mismatch, trying ${blockHeight}`)
        block = await getManager().findOne(TxBlock, blockHeight)
      } else {
        blockHeight = block.height + 1
        keepGoing = false
      }
    } else {
      blockHeight = config.startBlockSync
      keepGoing = false
    }
  } while (keepGoing)

	try {
    await processBlocks()
    console.log('sync complete')
  }
  catch (err) {
		console.error('error syncing: ', err)
  }
  finally {
    setTimeout(syncChain, 4000)
  }
}

async function processBlocks () {
  console.log(`syncing block ${blockHeight}`)

  let blockHash: string
  try {
    blockHash = await rpc.getBlockHash(blockHeight)
  } catch (err) {
    console.log(err)
    return
  }

  const block = await rpc.getBlock(blockHash)
  const { borkerTxs, created, spent } = processBlock(block, Network.Dogecoin)
  // const borkerTxs = getMockBorkerTxs(blockHeight)
  // const created = getMockCreated(blockHeight)
  // const spent = getMockSpent(blockHeight)

  // @TODO should we save the block height on utxos, posts, and orphans, such that we can delete them in the event of a fork? Do we need to delete them?
  await getManager().transaction(async manager => {
    await Promise.all([
      createTxBlock(manager, blockHeight, blockHash),
      processUtxos(manager, created, spent),
      processBorkerTxs(manager, borkerTxs),
    ])
  })

  // cleanupOrphans()

  blockHeight++

  await processBlocks()
}

async function createTxBlock(manager: EntityManager, height: number, hash: string) {
  await manager.createQueryBuilder()
    .insert()
    .into(TxBlock)
    .values({
      height,
      hash,
    })
    .onConflict('(height) DO UPDATE SET hash = :hash')
    .setParameter('hash', hash)
    .execute()
}

async function processUtxos(manager: EntityManager, created: NewUtxo[], spent: UtxoId[]) {
  // insert created utxos
  if (created.length) {
    await Promise.all(chunks(created, 100).map(chunk => {
      return manager.createQueryBuilder()
        .insert()
        .into(Utxo)
        .values(chunk)
        .onConflict('(txid, position) DO NOTHING')
        .execute()
    }))
  }
  // delete spent utxos
  if (spent.length) {
    await Promise.all(chunks(spent, 100).map(chunk => {
      return manager.delete(Utxo, chunk)
    }))
  }
}

async function processBorkerTxs(manager: EntityManager, borkerTxs: BorkTxData[]) {

  for (let tx of borkerTxs) {
    const { time, type, content, senderAddress } = tx

    // create sender
    await manager.createQueryBuilder()
      .insert()
      .into(User)
      .values({
        address: senderAddress,
        createdAt: new Date(time),
        birthBlock: blockHeight,
        name: senderAddress.substr(0, 9),
      })
      .onConflict('(address) DO NOTHING')
      .execute()

    switch (type) {
      // set_name, set_bio, set_avatar
      case BorkType.SetName:
      case BorkType.SetBio:
      case BorkType.SetAvatar:
        await handleProfileUpdate(manager, type, senderAddress, content)
        break
      // bork
      case BorkType.Bork:
        await createPost(manager, tx)
        break
      // comment, rebork
      case BorkType.Comment:
      case BorkType.Rebork:
        await handleCR(manager, tx)
        break
      // extension
      case BorkType.Extension:
        await handleExtension(manager, tx)
        break
      // like
      case BorkType.Like:
        await handleLike(manager, tx)
        break
      // flag, unflag, unlike
      case BorkType.Unlike:
      case BorkType.Flag:
      case BorkType.Unflag:
        await handleFUU(manager, tx)
        break
      // follow, unfollow, block, unblock
      case BorkType.Follow:
      case BorkType.Unfollow:
      case BorkType.Block:
      case BorkType.Unblock:
        await handleFUBU(manager, tx)
        break
      // delete
      case BorkType.Delete:
        await handleDelete(manager, tx)
        break
    }
  }
}

async function handleProfileUpdate(manager: EntityManager, type: BorkType, senderAddress: string, content: string) {
  let params: Partial<User>

  switch (type) {
    case BorkType.SetName:
      params = { name: content }
      break
    case BorkType.SetBio:
      params = { bio: content }
      break
    case BorkType.SetAvatar:
      params = { avatarLink: content }
      break
  }
  await manager.update(User, senderAddress, params)
}

async function createPost (manager: EntityManager, tx: any, parent?: Post): Promise<void> {
  const { txid, time, nonce, position, type, content, senderAddress, mentions } = tx

  // create post
  await manager.createQueryBuilder()
    .insert()
    .into(Post)
    .values({
      txid,
      createdAt: new Date(time),
      nonce,
      position,
      type,
      content,
      sender: { address: senderAddress },
      parent,
    })
    .onConflict('(txid) DO NOTHING')
    .execute()

    await Promise.all([
      // attach tags
      attachTags(manager, txid, content),
      // attach mentions
      attachMentions(manager, txid, mentions),
    ])
}

async function createOrphan (manager: EntityManager, tx: any): Promise<void> {
  const { txid, time, type, nonce, position, content, referenceId, senderAddress, recipientAddress, mentions } = tx

  await manager.createQueryBuilder()
    .insert()
    .into(Orphan)
    .values({
      txid,
      createdAt: new Date(time),
      type,
      nonce,
      position,
      content,
      senderAddress,
      referenceId,
      referenceSenderAddress: recipientAddress,
      mentions: mentions.join(),
    })
    .onConflict('(txid) DO NOTHING')
    .execute()
}

async function handleCR (manager: EntityManager, tx: BorkTxData): Promise<void> {
  const { referenceId, senderAddress, recipientAddress } = tx

  // return if either party blocked
  if (await eitherPartyBlocked(recipientAddress, senderAddress)) { return }
  // find parent
  const parent = await manager.findOne(Post, {
    where: {
      txid: Like(`${referenceId}%`),
      sender: { address: recipientAddress },
    },
    order: { createdAt: 'DESC' },
  })
  // create post if parent exists
  if (parent) {
    await createPost(manager, tx, parent)
  // create orphan if no parent
  } else {
    await createOrphan(manager, tx)
  }
}

async function handleExtension (manager: EntityManager, tx: BorkTxData): Promise<void> {
  const { time, nonce, senderAddress } = tx

  // find parent
  const parent = await manager.findOne(Post, {
    where: {
      nonce,
      sender: { address: senderAddress },
      type: Not(BorkType.Extension),
      createdAt: MoreThan(getCutoff(new Date(time))),
    },
    order: { createdAt: 'DESC' },
  })
  // create post if parent exists
  if (parent) {
    await createPost(manager, tx, parent)
  // create orphan if no parent
  } else {
    await createOrphan(manager, tx)
  }
}

async function handleLike (manager: EntityManager, tx: BorkTxData): Promise<void> {
  const { referenceId, senderAddress, recipientAddress } = tx

  // return if either party is blocked
  if (await eitherPartyBlocked(recipientAddress, senderAddress)) { return }
  // find parent
  const parent = await manager.findOne(Post, {
    where: {
      txid: Like(`${referenceId}%`),
      sender: { address: recipientAddress },
    },
    order: { createdAt: 'DESC' },
  })
  // create like if parent exists
  if (parent) {
    await manager.createQueryBuilder()
      .insert()
      .into('likes')
      .values({
        user_address: senderAddress,
        post_txid: parent.txid,
      })
      .onConflict('DO NOTHING')
      .execute()
  // create orphan if no parent
  } else {
    await createOrphan(manager, tx)
  }
}

async function handleFUU (manager: EntityManager, tx: BorkTxData): Promise<void> {
  const { type, content, senderAddress } = tx

  // find parent from content of tx
  const parent = await manager.findOne(Post, content)

  // create flag, unflag, or unlike if parent exists
  if (parent) {
    // return if either party blocked
    if (await eitherPartyBlocked(parent.senderAddress, senderAddress)) { return }

    switch (type) {
      // flag
      case BorkType.Flag:
        await manager.createQueryBuilder()
          .insert()
          .into('flags')
          .values({
            user_address: senderAddress,
            post_txid: parent.txid,
          })
          .onConflict('DO NOTHING')
          .execute()
        break
      // unflag
      case BorkType.Unflag:
        await manager.createQueryBuilder()
          .relation(User, 'flags')
          .of(senderAddress)
          .remove(parent.txid)
        break
      // unlike
      case BorkType.Unlike:
        await manager.createQueryBuilder()
          .relation(User, 'likes')
          .of(senderAddress)
          .remove(parent.txid)
        break
    }
  // create orphan if no parent
  } else {
    await createOrphan(manager, tx)
  }
}

async function handleFUBU (manager: EntityManager, tx: BorkTxData): Promise<void> {
  const { type, senderAddress, recipientAddress } = tx

  // get recipient from content of post
  const recipient = await manager.findOne(User, recipientAddress)

  // create follow, unfollow, block, or unblock if recipient exists
  if (recipient) {
    switch (type) {
      // follow
      case BorkType.Follow:
        await manager.createQueryBuilder()
          .insert()
          .into('follows')
          .values({
            follower_address: senderAddress,
            followed_address: recipient.address,
          })
          .onConflict('DO NOTHING')
          .execute()
        break
      // unfollow
      case BorkType.Unfollow:
        await manager.createQueryBuilder()
          .relation(User, 'following')
          .of(senderAddress)
          .remove(recipient.address)
        break
      // block
      case BorkType.Block:
        await manager.createQueryBuilder()
          .insert()
          .into('blocks')
          .values({
            blocker_address: senderAddress,
            blocked_address: recipient.address,
          })
          .onConflict('DO NOTHING')
          .execute()
        break
      // unblock
      case BorkType.Unblock:
        await manager.createQueryBuilder()
          .relation(User, 'blocking')
          .of(senderAddress)
          .remove(recipient.address)
        break
    }
  } else {
    await createOrphan(manager, tx)
  }
}

async function handleDelete (manager: EntityManager, tx: BorkTxData): Promise<void> {
  const { time, content, senderAddress } = tx

  // find parent from content of tx
  const parent = await manager.findOne(Post, content)

  // delete parent if exists
  if (parent) {
    // benign if parent sender !== sender
    await manager.update(Post, { sender: { address: senderAddress }, txid: parent.txid }, { content: null, deletedAt: new Date(time) })
  // create orphan if no parent
  } else {
    await createOrphan(manager, tx)
  }
}

// async function cleanupOrphans (manager: EntityManager): Promise<void> {

//   await Promise.all([
//     // create comments and reborks
//     manager.query(`
//       INSERT INTO posts (txid, created_at, nonce, position, type, content, sender_address, parent_txid)
//       SELECT txid, created_at, nonce, position, type, content, sender_address, $1
//       FROM orphans
//       WHERE reference_sender_address = $2
//       AND type IN ('comment', 'rebork')
//       AND $1 LIKE reference_id || '%'
//     `, [txid, senderAddress]),
//     // create extensions
//     manager.query(`
//       INSERT INTO posts (txid, created_at, nonce, position, type, content, sender_address, parent_txid)
//       SELECT txid, created_at, nonce, position, type, content, sender_address, $1
//       FROM orphans
//       WHERE reference_sender_address = $2
//       AND type = 'extension'
//       AND nonce = $3
//       AND created_at > $4
//     `, [txid, senderAddress, nonce, getCutoff(new Date(time))]),
//     // create likes
//     manager.query(`
//       INSERT INTO likes (post_txid, user_address)
//       SELECT $1, sender_address
//       FROM orphans
//       WHERE reference_sender_address = $2
//       AND $1 LIKE reference_id || '%'
//     `, [txid, senderAddress]),
//   ])

//   // delete orphans
//   await manager.createQueryBuilder()
//     .delete()
//     .from(Orphan)
//     .where('reference_sender_address = :senderAddress', { senderAddress })
//     .andWhere(`nonce = :nonce OR :txid LIKE reference_id || '%'`, { nonce, txid })
//     .execute()
// }

async function attachTags (manager: EntityManager, txid: string, content: string): Promise<void> {
  const regex = /(?:^|\s)(?:#)([a-zA-Z\d]+)/gm
  let match: RegExpExecArray

  let postTags = []

  // limit post tags to 10
  while ((match = regex.exec(content)) && postTags.length < 11) {
    const name = match[1].toLowerCase()
    // find or create tag
    await manager.createQueryBuilder()
      .insert()
      .into(Tag)
      .values({
        name,
      })
      .onConflict('DO NOTHING')
      .execute()

    postTags.push({ tag_name: name, post_txid: txid })
  }

  if (postTags.length) {
    await manager.createQueryBuilder()
      .insert()
      .into('post_tags')
      .values(postTags)
      .onConflict('DO NOTHING')
      .execute()
  }
}

async function attachMentions (manager: EntityManager, txid: string, unverified: string[]): Promise<void> {
  let mentions = []
  await Promise.all(unverified.map(async address => {
    const user = await manager.findOne(User, address)
    if (!user) { return }
    mentions.push({ user_address: address, post_txid: txid })
  }))

  if (mentions.length) {
    await manager.createQueryBuilder()
      .insert()
      .into('mentions')
      .values(mentions)
      .onConflict('DO NOTHING')
      .execute()
  }
}

function getCutoff (now: Date): Date {
  return new Date(now.setHours(now.getHours() - 24))
}
