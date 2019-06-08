import * as rpc from '../util/rpc-requests'
import * as fs from 'fs'
import { getManager, EntityManager, Like, MoreThan, IsNull, FindConditions, Not } from 'typeorm'
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

    const { time, type, senderAddress } = tx

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
        await handleProfileUpdate(manager, tx)
        break
      // bork
      case BorkType.Bork:
        await createBork(manager, tx)
        break
      // comment, rebork, like
      case BorkType.Comment:
      case BorkType.Rebork:
      case BorkType.Like:
        await handleCommentReborkLike(manager, tx)
        break
      // extension
      case BorkType.Extension:
        await handleExtension(manager, tx)
        break
      // flag
      case BorkType.Flag:
        await handleFlag(manager, tx)
        break
      // follow, block
      case BorkType.Follow:
      case BorkType.Block:
        await handleFollowBlock(manager, tx)
        break
      // delete
      case BorkType.Delete:
        await handleDelete(manager, tx)
        break
    }
}

async function handleProfileUpdate(manager: EntityManager, tx: BorkTxData) {
  const { type, content, senderAddress } = tx

  let params: Partial<User> = {}
  switch (type) {
    case BorkType.SetName:
      params.name = content
      break
    case BorkType.SetBio:
      params.bio = content
      break
    case BorkType.SetAvatar:
      params.avatarLink = content
      break
  }

  await Promise.all([
    manager.update(User, senderAddress, params),
    createBork(manager, tx),
  ])
}

async function createBork (manager: EntityManager, tx: BorkTxData & { parentTxid?: string }): Promise<void> {
  const { txid, time, nonce, position, type, content, senderAddress, recipientAddress, parentTxid, mentions } = tx

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
      recipient: { address: recipientAddress },
      parent: { txid: parentTxid },
    })
    .onConflict('(txid) DO NOTHING')
    .execute()

  if ([BorkType.Bork, BorkType.Comment, BorkType.Rebork, BorkType.Extension].includes(type)) {
    await Promise.all([
      // attach tags
      attachTags(manager, txid, content),
      // attach mentions
      attachMentions(manager, txid, mentions),
    ])
  }
}

async function handleCommentReborkLike (manager: EntityManager, tx: BorkTxData): Promise<void> {
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
  await createBork(manager, {
    ...tx,
    parentTxid: parent.txid,
  })
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
    await createBork(manager, {
      ...tx,
      parentTxid: parent.txid,
    })
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

async function handleFlag (manager: EntityManager, tx: BorkTxData): Promise<void> {
  const { content, senderAddress } = tx

  // find parent from content
  const parent = await manager.findOne(Bork, content)
  if (!parent) { return }

  // return if either party blocked
  if (await eitherPartyBlocked(parent.senderAddress, senderAddress)) { return }

  // create bork if parent exists
  await createBork(manager, {
    ...tx,
    content: null,
    parentTxid: parent.txid,
  })
}

async function handleFollowBlock (manager: EntityManager, tx: BorkTxData): Promise<void> {

  // find recipient from content
  const recipient = await manager.findOne(User, tx.content)
  if (!recipient) { return }

  // create bork if recipient exists
  await createBork(manager, {
    ...tx,
    content: null,
    recipientAddress: recipient.address,
  })
}

async function handleDelete (manager: EntityManager, tx: BorkTxData): Promise<void> {
  const { time, referenceId, senderAddress } = tx

  // find parent from sender and content
  const bork = await manager.findOne(Bork, {
    where: {
      txid: Like(`${referenceId}%`),
      sender: { address: senderAddress },
      deletedAt: IsNull(),
    },
    order: { createdAt: 'DESC' },
  })
  if (!bork) { return }

  let conditions: FindConditions<Bork> = {}
  let params: Partial<Bork> = { deletedAt: new Date(time) }
  switch (bork.type) {
    // delete single bork if bork, comment, rebork, extension
    case BorkType.Bork:
    case BorkType.Comment:
    case BorkType.Rebork:
    case BorkType.Extension:
      conditions.txid = bork.txid
      params.content = null
      break
    // delete all if like, flag, follow, block
    case BorkType.Like:
    case BorkType.Flag:
    case BorkType.Follow:
    case BorkType.Block:
      conditions.sender = { address: bork.senderAddress }
      conditions.type = bork.type
      conditions.deletedAt = IsNull()
      // find by parent if like, flag
      if ([BorkType.Like, BorkType.Flag].includes(bork.type)) {
        conditions.parent = { txid: bork.parentTxid }
      // find by recipient if follow, block
      } else {
        conditions.recipient = { address: bork.recipientAddress }
      }
      break
    // do nothing if setName, setBio, setAvatar, delete
    default:
      break
  }

  await Promise.all([
    manager.update(Bork, conditions, params),
    createBork(manager, {
      ...tx,
      content: null,
      parentTxid: bork.txid,
    }),
  ])
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
          // create extensions
          Promise.all(orphans.map(orphan => createBork(manager, {
            ...orphan,
            mentions: orphan.mentions.split(','),
            type: BorkType.Extension,
            parentTxid: orphan.parentTxid,
            referenceId: null,
            recipientAddress: null,
          }))),
          // delete orphans
          manager.delete(Orphan, orphans.map(orphan => orphan.txid)),
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
