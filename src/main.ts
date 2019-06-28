import { getManager, EntityManager, Like, MoreThan, IsNull, FindConditions, Not, In } from 'typeorm'
import { Bork } from './db/entities/bork'
import { TxBlock } from './db/entities/tx-block'
import { User } from './db/entities/user'
import { Tag } from './db/entities/tag'
import { Orphan } from './db/entities/orphan'
import { eitherPartyBlocked, NullToUndefined } from './util/functions'
import { processBlock, Network, BorkType, BorkTxData } from 'borker-rs-node'
import { OrphanBork } from './util/types'
import * as config from '../borkerconfig.json'
import { getBlockHashReq, getBlockReq } from './util/superdoge'

let blockHeight: number
let cleaning: number | null

export async function sync () {
  console.log('Begin sync')

  try {
    await setBlockHeight()
  } catch (e) {
    console.error('Error in setBlockHeight(): ', e.message)
  }

  try {
    await processBlocks()
    console.log('Sync complete')
  } catch (e) {
    console.error('Error in processBlocks(): ', e.message)
  }

  setTimeout(sync, 4000)
}

async function setBlockHeight (): Promise<void> {
  let block = await getManager().findOne(TxBlock, { order: { height: 'DESC' } })
  let keepGoing = true
  do {
    if (block) {
      const hash = await getBlockHashReq(block.height)
      // handle chain reorgs
      if (hash !== block.hash) {
        blockHeight = block.height - 6
        console.log(`Block ${block.height} hash mismatch. Rolling back to ${blockHeight}`)
        block = await getManager().findOne(TxBlock, blockHeight)
        // next if no reorg
      } else {
        blockHeight = block.height + 1
        keepGoing = false
      }
      // config.start if no block
    } else {
      blockHeight = config.start
      keepGoing = false
    }
  } while (keepGoing)
}

async function processBlocks () {
  console.log(`syncing ${blockHeight}`)

  const hash = await getBlockHashReq(blockHeight)
  const bytes = await getBlockReq(hash)

  const txs = await processBlock(bytes, blockHeight, Network.Dogecoin)

  await getManager().transaction(async manager => {
    await Promise.all([
      createTxBlock(manager, hash),
      processBorks(manager, txs),
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

async function createTxBlock (manager: EntityManager, hash: string) {
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

async function processBorks (manager: EntityManager, txs: BorkTxData[]): Promise<void> {
  for (let tx of txs) {
    await processBorkerTx(manager, tx)
  }
}

async function processBorkerTx (manager: EntityManager, tx: BorkTxData) {

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

async function handleProfileUpdate (manager: EntityManager, tx: BorkTxData) {
  const { type, content, senderAddress } = tx

  let params: Partial<User> = {}
  switch (type) {
    case BorkType.SetName:
      params.name = NullToUndefined(content) // content || undefined (instead?)
      break
    case BorkType.SetBio:
      params.bio = content
      break
    case BorkType.SetAvatar:
      params.avatarLink = content
      break
  }

  await manager.update(User, senderAddress, params)
}

async function createBork (manager: EntityManager, tx: BorkTxData & { parentTxid?: string }): Promise<void> {
  const { txid, time, nonce, position, type, content, senderAddress, recipientAddress, parentTxid, mentions, tags } = tx

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
      recipient: { address: recipientAddress! },
      parent: { txid: parentTxid },
    })
    .onConflict('(txid) DO NOTHING')
    .execute()

  if ([BorkType.Bork, BorkType.Comment, BorkType.Rebork, BorkType.Extension].includes(type)) {
    await Promise.all([
      // attach tags
      attachTags(manager, txid, tags),
      // attach mentions
      attachMentions(manager, txid, mentions),
    ])
  }
}

async function handleCommentReborkLike (manager: EntityManager, tx: BorkTxData): Promise<void> {
  const { referenceId, senderAddress, recipientAddress } = tx

  // return if either party blocked
  if (await eitherPartyBlocked(recipientAddress!, senderAddress)) { return }

  // find parent
  const parent = await manager.findOne(Bork, {
    where: {
      txid: Like(`${referenceId}%`),
      sender: { address: recipientAddress },
      type: In([BorkType.Bork, BorkType.Comment, BorkType.Rebork, BorkType.Extension]),
    },
    order: { createdAt: 'ASC' },
  })
  if (!parent) { return }

  // create bork if parent exists, no need to save recipient
  await createBork(manager, {
    ...tx,
    parentTxid: parent.txid,
    recipientAddress: null,
  })
}

async function handleExtension (manager: EntityManager, tx: BorkTxData): Promise<void> {
  const { txid, time, nonce, position, content, senderAddress, mentions, tags } = tx

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
        blockHeight: blockHeight,
        nonce: nonce!,
        position: position!,
        content: content!,
        sender: { address: senderAddress },
        mentions: mentions.join(),
        tags: tags.join(),
      })
      .onConflict('(txid) DO NOTHING')
      .execute()
  }
}

async function handleFlag (manager: EntityManager, tx: BorkTxData): Promise<void> {
  const { referenceId, senderAddress } = tx

  // find parent from content
  const parent = await manager.findOne(Bork, {
    txid: referenceId!,
    type: In([BorkType.Bork, BorkType.Comment, BorkType.Rebork, BorkType.Extension]),
  })
  if (!parent) { return }

  // return if either party blocked
  if (await eitherPartyBlocked(parent.senderAddress, senderAddress)) { return }

  // create bork if parent exists
  await createBork(manager, {
    ...tx,
    content: null,
    parentTxid: parent.txid,
    recipientAddress: parent.senderAddress,
  })
}

async function handleFollowBlock (manager: EntityManager, tx: BorkTxData): Promise<void> {

  // find recipient from content
  const recipient = await manager.findOne(User, tx.content!)
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
    order: { createdAt: 'ASC' },
  })
  if (!bork) { return }

  switch (bork.type) {
    // soft delete single bork if bork, comment, rebork, extension
    case BorkType.Bork:
    case BorkType.Comment:
    case BorkType.Rebork:
    case BorkType.Extension:
      await manager.update(Bork, bork.txid, {
        deletedAt: new Date(time),
        content: null,
      })
      break
    // hard delete all if like, flag, follow, block
    case BorkType.Like:
    case BorkType.Flag:
    case BorkType.Follow:
    case BorkType.Block:
      const conditions: FindConditions<Bork> = {
        sender: { address: bork.senderAddress },
        type: bork.type,
      }
      // find by parent if like, flag
      if ([BorkType.Like, BorkType.Flag].includes(bork.type)) {
        conditions.parent = { txid: bork.parentTxid! }
        // find by recipient if follow, block
      } else {
        conditions.recipient = { address: bork.recipientAddress! }
      }
      await manager.delete(Bork, conditions)
      break
    // do nothing if setName, setBio, setAvatar, delete
    default:
      break
  }
}

async function cleanupOrphans (): Promise<void> {

  try {
    // find orphans
    const orphans: OrphanBork[] = await getManager().query(`
      SELECT o.txid, o.created_at as time, o.nonce, o.position, o.content, o.mentions, o.tags, o.sender_address as senderAddress, b.txid as parentTxid, MIN(b.created_at)
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
            mentions: orphan.mentions ? orphan.mentions.split(',') : [],
            tags: orphan.tags ? orphan.tags.split(',') : [],
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
  } catch (e) {
    console.error('Error in cleanupOrphans(): ', e.message)
  }
  // reset cleaning
  cleaning = null
}

async function attachTags (manager: EntityManager, txid: string, tags: string[]): Promise < void > {

  const borkTags: {
    tag_name: string,
    bork_txid: string
  }[] = []

  // find or create tags
  await Promise.all(tags.map(async name => {
    await manager.createQueryBuilder()
      .insert()
      .into(Tag)
      .values({ name })
      .onConflict('DO NOTHING')
      .execute(),
      borkTags.push({ tag_name: name, bork_txid: txid })
  }))

  // create bork_tags if tags
  if (borkTags.length) {
    await manager.createQueryBuilder()
      .insert()
      .into('bork_tags')
      .values(borkTags)
      .onConflict('DO NOTHING')
      .execute()
  }
}

async function attachMentions (manager: EntityManager, txid: string, unverified: string[]): Promise < void > {

  const mentions: {
    user_address: string,
    bork_txid: string
  }[] = []

  // finds users
  await Promise.all(unverified.map(async address => {
    const user = await manager.findOne(User, address)
    if (!user) { return }
    mentions.push({ user_address: address, bork_txid: txid })
  }))

  // create mentions if users
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
