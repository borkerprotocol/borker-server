import * as rpc from '../util/rpc-requests'
import * as fs from 'fs'
import { getManager, EntityManager, Like, Not, MoreThan } from 'typeorm'
import { Bork } from '../db/entities/bork'
import { TxBlock } from '../db/entities/tx-block'
import { User } from '../db/entities/user'
import { Tag } from '../db/entities/tag'
import { Utxo } from '../db/entities/utxo'
import { Orphan } from '../db/entities/orphan'
import { eitherPartyBlocked } from '../util/functions'
import { processBlock, Network, BorkType, BorkTxData, UtxoId, NewUtxo } from 'borker-rs-node'
// import { getMockBorkerTxs, getMockCreated, getMockSpent } from '../util/mocks'

let config = JSON.parse(fs.readFileSync('borkerconfig.json', 'utf8'))
let blockHeight: number
let cleaning: number | null

export async function syncChain () {
  console.log('begin sync')
  await setBlockHeight()

	try {
    await processBlocks()
    console.log('sync complete')
  }
  catch (err) {
		console.error('error in processBlocks(): ', err.message)
  }
  finally {
    setTimeout(syncChain, 4000)
  }
}

async function setBlockHeight (): Promise<void> {
  let block = await getManager().findOne(TxBlock, { order: { height: 'DESC' } })
  let keepGoing = true
  // handle chain reorgs
  do {
    if (block) {
      const blockHash = await rpc.getBlockHash(block.height)
      if (blockHash !== block.hash) {
        blockHeight = block.height - 6
        console.log(`block ${block.height} hash mismatch, rolling back to ${blockHeight}`)
        const [nextBlock] = await Promise.all([
          getManager().findOne(TxBlock, blockHeight),
          // delete all Utxos to prevent double spend
          getManager().delete(Utxo, { blockHeight: MoreThan(blockHeight) }),
        ])
        block = nextBlock
      } else {
        blockHeight = block.height + 1
        keepGoing = false
      }
    } else {
      blockHeight = config.startBlockSync
      keepGoing = false
    }
  } while (keepGoing)
}

async function processBlocks () {
  console.log(`syncing ${blockHeight}`)

  let blockHash: string
  try {
    blockHash = await rpc.getBlockHash(blockHeight)
  } catch (err) {
    // if (JSON.parse(err.error).error.code !== -8) { console.error(err.message) }
    return
  }

  const blockHex = await rpc.getBlock(blockHash)
  const { borkerTxs, created, spent } = processBlock(blockHex, BigInt(blockHeight) as any, Network.Dogecoin)
  // const borkerTxs = getMockBorkerTxs(blockHeight)
  // const created = getMockCreated(blockHeight)
  // const spent = getMockSpent(blockHeight)

  await getManager().transaction(async manager => {
    await Promise.all([
      createTxBlock(manager, blockHash),
      processUtxos(manager, created, spent),
      Promise.all(borkerTxs.map(tx => processBorkerTx(manager, tx))),
    ])
  })

  // cleanup orphans if not already cleaning
  if (!cleaning) {
    cleaning = blockHeight
    cleanupOrphans()
  }

  blockHeight++

  await processBlocks()
}

async function createTxBlock(manager: EntityManager, hash: string) {
  await manager.createQueryBuilder()
    .insert()
    .into(TxBlock)
    .values({
      height: blockHeight,
      hash,
    })
    .onConflict('(height) DO UPDATE SET hash = :hash')
    .setParameter('hash', hash)
    .execute()
}

async function processUtxos(manager: EntityManager, created: NewUtxo[][], spent: UtxoId[][]) {
  // insert created utxos
  if (created.length) {
    await Promise.all(created.map(chunk => {
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
    await Promise.all(spent.map(chunk => {
      return manager.delete(Utxo, chunk)
    }))
  }
}

async function processBorkerTx(manager: EntityManager, tx: BorkTxData) {

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
        await createBork(manager, tx)
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
        await manager.update(Bork, { sender: { address: senderAddress }, txid: content }, { content: null, deletedAt: new Date(time) })
        break
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

async function createBork (manager: EntityManager, tx: BorkTxData, parentTxid?: string): Promise<void> {
  const { txid, time, nonce, position, type, content, senderAddress, mentions } = tx

  // create bork
  await manager.createQueryBuilder()
    .insert()
    .into(Bork)
    .values({
      txid,
      createdAt: new Date(time),
      nonce,
      position,
      type,
      content,
      sender: { address: senderAddress },
      parent: { txid: parentTxid },
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

async function handleCR (manager: EntityManager, tx: BorkTxData): Promise<void> {
  const { referenceId, senderAddress, recipientAddress } = tx

  // return if either party blocked
  if (await eitherPartyBlocked(recipientAddress, senderAddress)) { return }

  // find parent
  const parent = await manager.findOne(Bork, {
    where: {
      txid: Like(`${referenceId}%`),
      sender: { address: recipientAddress },
    },
    order: { createdAt: 'DESC' },
  })
  if (!parent) { return }

  // create bork if parent exists
  await createBork(manager, tx, parent.txid)
}

async function handleExtension (manager: EntityManager, tx: BorkTxData): Promise<void> {
  const { txid, time, nonce, position, content, senderAddress, mentions } = tx

  // find parent
  const parent = await manager.findOne(Bork, {
    where: {
      nonce,
      sender: { address: senderAddress },
      type: Not(BorkType.Extension),
      createdAt: MoreThan(getCutoff(new Date(time))),
    },
    order: { createdAt: 'DESC' },
  })
  // create bork if parent exists
  if (parent) {
    await createBork(manager, tx, parent.txid)
  // create orphan if no parent
  } else {
    await manager.createQueryBuilder()
      .insert()
      .into(Orphan)
      .values({
        txid,
        createdAt: new Date(time),
        blockHeight,
        nonce,
        position,
        content,
        sender: { address: senderAddress },
        mentions: mentions.join(),
      })
      .onConflict('(txid) DO NOTHING')
      .execute()
  }
}

async function handleLike (manager: EntityManager, tx: BorkTxData): Promise<void> {
  const { referenceId, senderAddress, recipientAddress } = tx

  // return if either party is blocked
  if (await eitherPartyBlocked(recipientAddress, senderAddress)) { return }

  // find parent
  const parent = await manager.findOne(Bork, {
    where: {
      txid: Like(`${referenceId}%`),
      sender: { address: recipientAddress },
    },
    order: { createdAt: 'DESC' },
  })
  if (!parent) { return }

  // create like if parent exists
  await manager.createQueryBuilder()
    .insert()
    .into('likes')
    .values({
      user_address: senderAddress,
      bork_txid: parent.txid,
    })
    .onConflict('DO NOTHING')
    .execute()
}

async function handleFUU (manager: EntityManager, tx: BorkTxData): Promise<void> {
  const { type, content, senderAddress } = tx

  // find parent from content of tx
  const parent = await manager.findOne(Bork, content)
  if (!parent) { return }

  // return if either party blocked
  if (await eitherPartyBlocked(parent.senderAddress, senderAddress)) { return }

  // create flag, unflag, or unlike if parent exists
  switch (type) {
    // flag
    case BorkType.Flag:
      await manager.createQueryBuilder()
        .insert()
        .into('flags')
        .values({
          user_address: senderAddress,
          bork_txid: parent.txid,
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
}

async function handleFUBU (manager: EntityManager, tx: BorkTxData): Promise<void> {
  const { type, senderAddress, recipientAddress } = tx

  // get recipient from content of bork
  const recipient = await manager.findOne(User, recipientAddress)
  if (!recipient) { return }

  // create follow, unfollow, block, or unblock if recipient exists
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
}

async function cleanupOrphans (): Promise<void> {

  try {
    // find orphans
    const orphans: OrphanBork[] = await getManager().query(`
      SELECT o.txid, o.created_at as time, o.nonce, o.position, o.content, o.mentions, o.sender_address as senderAddress, b.txid as parentTxid, MIN(b.created_at)
      FROM orphans o
      INNER JOIN borks b
      ON b.sender_address = o.sender_address
      AND b.nonce = o.nonce
      AND b.created_at BETWEEN o.created_at AND DATETIME(o.created_at, '+24 hours')
      AND o.block_height <= $1
      GROUP BY o.txid
    `, [cleaning])
    // create extenstions and delete orphans if orpahns exist
    if (orphans.length) {
      await getManager().transaction(async manager => {
        await Promise.all([
          // create borks
          Promise.all(orphans.map(orphan => createBork(manager, Object.assign(orphan, {
            mentions: orphan.mentions.split(','),
            type: BorkType.Extension,
            referenceId: null,
            recipientAddress: null,
          }), orphan.parentTxid))),
          // delete orphans
          orphans.length && manager.delete(Orphan, orphans.map(orphan => orphan.txid)),
        ])
      })
    }
  } catch (err) {
    console.error('error in cleanupOrphans(): ', err.message)
  }
  // reset cleaning
  cleaning = null
}

async function attachTags (manager: EntityManager, txid: string, content: string): Promise<void> {
  const regex = /(?:^|\s)(?:#)([a-zA-Z\d]+)/gm
  let match: RegExpExecArray

  let borkTags = []

  // limit bork tags to 10
  while ((match = regex.exec(content)) && borkTags.length < 11) {
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

    borkTags.push({ tag_name: name, bork_txid: txid })
  }

  if (borkTags.length) {
    await manager.createQueryBuilder()
      .insert()
      .into('bork_tags')
      .values(borkTags)
      .onConflict('DO NOTHING')
      .execute()
  }
}

async function attachMentions (manager: EntityManager, txid: string, unverified: string[]): Promise<void> {
  let mentions = []
  await Promise.all(unverified.map(async address => {
    const user = await manager.findOne(User, address)
    if (!user) { return }
    mentions.push({ user_address: address, bork_txid: txid })
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

export interface OrphanBork {
  txid: string
  time: string
  nonce: number
  position: number
  content: string
  mentions: string
  senderAddress: string
  parentTxid: string
}
