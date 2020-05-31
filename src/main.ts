import { getManager, EntityManager, Like, MoreThan, IsNull, FindConditions, Not, In } from 'typeorm'
import { Bork } from './db/entities/bork'
import { TxBlock } from './db/entities/tx-block'
import { User } from './db/entities/user'
import { Tag } from './db/entities/tag'
import { Orphan } from './db/entities/orphan'
import { eitherPartyBlocked, NullToUndefined, isPost } from './util/functions'
import { OrphanBork } from './util/types'
import { BorkType, BorkTxData } from 'borker-rs-node'
import * as borkerlib from 'borker-rs-node'
import * as config from '../borkerconfig.json'
import * as superdoge from './util/superdoge'

let cleaning: number | null

export async function sync() {
  console.log('Begin sync')
  let height: number

  try {
    height = await getBlockHeight()
  } catch (e) {
    console.error('Error in getBlockHeight(): ', e.message)
    return setTimeout(sync, 4000)
  }

  try {
    await processBlocks(height)
    console.log('Sync complete')
  } catch (e) {
    console.error('Error in processBlocks(): ', e.message)
  } finally {
    setTimeout(sync, 4000)
  }
}

async function getBlockHeight(): Promise<number> {
  let block = await getManager().findOne(TxBlock, { order: { height: 'DESC' } })
  let keepGoing = true
  do {
    if (block) {
      const hash = await superdoge.getBlockHash(block.height)
      // handle chain reorgs
      if (hash !== block.hash) {
        let newHeight = block.height - 6
        console.log(`${block.height} hash mismatch. Rolling back to ${newHeight}`)
        block = await getManager().findOne(TxBlock, newHeight)
        // next if no reorg
      } else {
        keepGoing = false
      }
      // config.start if no block
    } else {
      keepGoing = false
    }
  } while (keepGoing)

  return block ? block.height + 1 : config.start
}

async function processBlocks(height: number): Promise<void> {
  const heightHashes = await superdoge.getBlockHashes(height)
  if (!heightHashes.length) { return }
  const blocks = await superdoge.getBlocks(heightHashes)
  const borks = blocks.map(block => borkerlib.processBlock(block, borkerlib.Network.Bitcoin))

  for (let i = 0; i < borks.length; i++) {
    await processBlock(height + i, heightHashes[i].hash, borks[i])
  }

  await processBlocks(height + blocks.length)
}

async function processBlock(height: number, hash: string, borks: BorkTxData[]): Promise<void> {
  console.log(height)

  await getManager().transaction(async manager => {
    await Promise.all([
      createTxBlock(manager, height, hash),
      processBorks(manager, height, borks),
    ])
  })

  // cleanup orphans if not already cleaning
  if (!cleaning) {
    cleaning = height
    cleanupOrphans()
  }
}

async function createTxBlock(manager: EntityManager, height: number, hash: string): Promise<void> {
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

async function processBorks(manager: EntityManager, height: number, borks: BorkTxData[]): Promise<void> {
  for (let bork of borks) {
    await processBork(manager, height, bork)
  }
}

async function processBork(manager: EntityManager, height: number, bork: BorkTxData): Promise<void> {

  const { time, type, senderAddress } = bork

  // create sender
  await manager.createQueryBuilder()
    .insert()
    .into(User)
    .values({
      address: senderAddress,
      createdAt: new Date(time),
      birthBlock: height,
      name: senderAddress.substr(0, 9),
    })
    .onConflict('(address) DO NOTHING')
    .execute()

  switch (type) {
    // set_name, set_bio, set_avatar
    case BorkType.SetName:
    case BorkType.SetBio:
    case BorkType.SetAvatar:
      await handleProfileUpdate(manager, bork)
      break
    // bork
    case BorkType.Bork:
      await createBork(manager, bork)
      break
    // comment, rebork, like
    case BorkType.Comment:
    case BorkType.Rebork:
    case BorkType.Like:
      await handleCommentReborkLike(manager, bork)
      break
    // extension
    case BorkType.Extension:
      await handleExtension(manager, height, bork)
      break
    // flag
    case BorkType.Flag:
      await handleFlag(manager, bork)
      break
    // follow, block
    case BorkType.Follow:
    case BorkType.Block:
      await handleFollowBlock(manager, bork)
      break
    // delete
    case BorkType.Delete:
      await handleDelete(manager, bork)
      break
  }
}

async function handleProfileUpdate(manager: EntityManager, bork: BorkTxData): Promise<void> {
  const { type, content, senderAddress } = bork

  let params: Partial<User> = { }
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

async function createBork(manager: EntityManager, bork: BorkTxData & { parentTxid?: string }): Promise<void> {
  const { txid, time, nonce, position, type, content, senderAddress, recipientAddress, parentTxid, mentions, tags } = bork

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

  if (isPost(type)) {
    await Promise.all([
      // attach tags
      attachTags(manager, txid, tags),
      // attach mentions
      attachMentions(manager, txid, mentions),
    ])
  }
}

async function handleCommentReborkLike(manager: EntityManager, bork: BorkTxData): Promise<void> {
  const { referenceId, senderAddress, recipientAddress } = bork

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
    ...bork,
    parentTxid: parent.txid,
    recipientAddress: null,
  })
}

async function handleExtension(manager: EntityManager, height: number, bork: BorkTxData): Promise<void> {
  const { txid, time, nonce, position, content, senderAddress, mentions, tags } = bork

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
      ...bork,
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
        blockHeight: height,
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

async function handleFlag(manager: EntityManager, bork: BorkTxData): Promise<void> {
  const { referenceId, senderAddress } = bork

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
    ...bork,
    content: null,
    parentTxid: parent.txid,
    recipientAddress: parent.senderAddress,
  })
}

async function handleFollowBlock(manager: EntityManager, bork: BorkTxData): Promise<void> {

  // find recipient from content
  const recipient = await manager.findOne(User, bork.content!)
  if (!recipient) { return }

  // create bork if recipient exists
  await createBork(manager, {
    ...bork,
    content: null,
    recipientAddress: recipient.address,
  })
}

async function handleDelete(manager: EntityManager, tx: BorkTxData): Promise<void> {
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

async function cleanupOrphans(): Promise<void> {

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

async function attachTags(manager: EntityManager, txid: string, tags: string[]): Promise<void> {

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

async function attachMentions(manager: EntityManager, txid: string, unverified: string[]): Promise<void> {

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

function getCutoff(now: Date): Date {
  return new Date(now.setHours(now.getHours() - 24))
}
