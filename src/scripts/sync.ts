import * as rpc from '../util/rpc-requests'
import * as fs from 'fs'
import { getManager, EntityManager, FindManyOptions, Like, Raw } from 'typeorm'
import { Post, PostType } from '../db/entities/post'
import { User } from '../db/entities/user'
import { BorkerTx, mockTxs1, mockTxs2, mockTxs3, mockTxs4, mockCreated1, mockCreated2, mockSpent1, mockSpent2, mockCreated3, mockCreated4, mockSpent3, mockSpent4, Spent, TransactionType } from '../util/mocks'
import { Tag } from '../db/entities/tag'
import { Utxo, UtxoSeed } from '../db/entities/utxo'
import { eitherPartyBlocked } from '../util/functions'
import { OrphanCR } from '../db/entities/orphan-cr'

// let borkerLib: any

const config = JSON.parse(fs.readFileSync('borkerconfig.json', 'utf8'))
let blockHeight: number

export async function syncChain () {
  console.log('begin sync')
  blockHeight = config.startBlockSync

	try {
    await processBlocks()
    console.log('sync complete')
  }
  catch (err) {
		console.error('error syncing: ', err)
  }
  finally {
    config.startBlockSync = blockHeight
    fs.writeFileSync('borkerconfig.json', JSON.stringify(config, null, 2), 'utf8')
    setTimeout(syncChain, 4000)
  }
}

async function processBlocks () {
  console.log(`syncing block ${blockHeight}`)

  const blockHash = await rpc.getBlockHash(blockHeight)
  if (!blockHash) return

  const block = await rpc.getBlock(blockHash)

  // const { borkerTxs: BorkerTx[], created: UtxoSeed[], spent: Spent[] } = borkerLib.process_block(block)
  const borkerTxs: BorkerTx[] = getBorkerTxs()
  const created: UtxoSeed[] = getCreated()
  const spent: Spent[] = getSpent()

  await getManager().transaction(async manager => {
    await Promise.all([
      processUtxos(manager, created, spent),
      processBorkerTxs(manager, borkerTxs),
    ])
  })

  blockHeight++
  await processBlocks()
}

// TODO delete this function once borkerLib is available
function getBorkerTxs () {
  if (blockHeight === 17903) {
    return mockTxs1
  } else if (blockHeight === 17904) {
    return mockTxs2
  } else if (blockHeight === 17905) {
    return mockTxs3
  } else if (blockHeight === 17906) {
    return mockTxs4
  } else {
    return []
  }
}

// TODO delete this function once borkerLib is available
function getCreated () {
  if (blockHeight === 17903) {
    return mockCreated1
  } else if (blockHeight === 17904) {
    return mockCreated2
  } else if (blockHeight === 17905) {
    return mockCreated3
  } else if (blockHeight === 17906) {
    return mockCreated4
  } else {
    return []
  }
}

// TODO delete this function once borkerLib is available
function getSpent () {
  if (blockHeight === 17903) {
    return mockSpent1
  } else if (blockHeight === 17904) {
    return mockSpent2
  } else if (blockHeight === 17905) {
    return mockSpent3
  } else if (blockHeight === 17906) {
    return mockSpent4
  } else {
    return []
  }
}

async function processUtxos(manager: EntityManager, created: Utxo[], spent: Spent[]) {
  // insert created utxos
  if (created.length) {
    await manager.createQueryBuilder()
      .insert()
      .into(Utxo)
      .values(created)
      .onConflict('("txid", "index") DO NOTHING')
      .execute()
  }
  // delete spent utxos
  if (spent.length) {
    await manager.delete(Utxo, spent)
  }
}

async function processBorkerTxs(manager: EntityManager, borkerTxs: BorkerTx[]) {

  for (let tx of borkerTxs) {

    const { time, type, content, referenceId, senderAddress, recipientAddress } = tx

    // find or create sender
    await manager.createQueryBuilder()
      .insert()
      .into(User)
      .values({
        address: senderAddress,
        createdAt: new Date(time),
        birthBlock: blockHeight,
        name: senderAddress.substr(0, 9),
      })
      .onConflict('("address") DO NOTHING')
      .execute()

    switch (type) {
      // if set_name, set_bio, set_avatar
      case TransactionType.setName:
      case TransactionType.setBio:
      case TransactionType.setAvatar:
        await handleProfileUpdate(manager, type, senderAddress, content)
        break
      // if bork, comment, rebork, extension
      case TransactionType.bork:
      case TransactionType.comment:
      case TransactionType.rebork:
      case TransactionType.extension:
        await handleBCRE(manager, tx)
        break
      // like
      case TransactionType.like:
        await handleLike(manager, referenceId, senderAddress, recipientAddress)
        break
      // flag, unflag, unlike
      case TransactionType.unlike:
      case TransactionType.flag:
      case TransactionType.unflag:
        await handleFUU(manager, type, senderAddress, content)
        break
      case TransactionType.follow:
      case TransactionType.unfollow:
      case TransactionType.block:
      case TransactionType.unblock:
        await handleFUBU(manager, type, senderAddress, content)
        break
      case TransactionType.delete:
        await manager.update(Post, { sender: { address: senderAddress }, txid: content }, { content: null, deletedAt: new Date(time) })
        break
    }
  }
}

async function handleProfileUpdate(manager: EntityManager, type: TransactionType, senderAddress: string, content: string) {
  let params: Partial<User>

  switch (type) {
    case TransactionType.setName:
      params = { name: content }
      break
    case TransactionType.setBio:
      params = { bio: content }
      break
    case TransactionType.setAvatar:
      params = { avatarLink: content }
      break
  }
  await manager.update(User, senderAddress, params)
}

async function handleBCRE (manager: EntityManager, tx: BorkerTx): Promise<void> {

  const { txid, time, nonce, index, type, content, referenceId, senderAddress, mentions } = tx

  // create post
  await manager.createQueryBuilder()
    .insert()
    .into(Post)
    .values({
      txid,
      createdAt: new Date(time),
      nonce,
      index,
      type: PostType[type],
      content,
      sender: { address: senderAddress },
    })
    .onConflict('("txid") DO NOTHING')
    .execute()

  await Promise.all([
    // update extension orphaned posts
    manager.createQueryBuilder()
      .update(Post)
      .set({ parent: { txid } })
      .where('parent_txid IS NULL')
      .andWhere('nonce = :nonce', { nonce })
      .andWhere('sender_address = :senderAddress', { senderAddress })
      .andWhere('type = :type', { type: TransactionType.extension })
      .andWhere('created_at > :cutoff', { cutoff: getCutoff(new Date(time)) })
      .execute(),
    // update CR orphaned posts
    manager.createQueryBuilder()
      .update(Post)
      .set({ parent: { txid } })
      .where('txid IN (SELECT post_txid FROM orphans_cr WHERE parent_sender_address = :senderAddress AND reference_id = :referenceId)', { senderAddress, referenceId })
      .execute(),
    // delete orphans
    manager.delete(OrphanCR, { parentSender: { address: senderAddress }, referenceId }),
    // attach tags
    attachTags(manager, txid, content),
    // attach mentions
    attachMentions(manager, txid, mentions),
    // if comment or rebork
    (type === TransactionType.comment || type === TransactionType.rebork) && handleCR(manager, tx),
    // if extension
    type === TransactionType.extension && handleExtension(manager, tx),
  ])

  // delete duplicate orphaned extension posts
  await manager.createQueryBuilder()
    .delete()
    .from(Post, 'posts')
    .where(`txid IN (
      SELECT txid FROM posts p1
      INNER JOIN posts p2
      ON p1.parent_txid = p2.parent_txid
      AND p1.index = p2.index
      AND p1.txid != p2.txid
      AND p1.created_at >= p2.created_at
      AND p1.txid = :txid
    )`, { txid })
}

async function handleCR (manager: EntityManager, tx: BorkerTx): Promise<void> {

  const { txid, time, referenceId, senderAddress, recipientAddress } = tx

  // if either party is blocked, return
  if (await eitherPartyBlocked(recipientAddress, senderAddress)) { return }
  // find the parent
  const parent = await manager.findOne(Post, {
    where: {
      txid: Like(`${referenceId}%`),
      sender: { address: recipientAddress },
    },
    order: { createdAt: 'DESC' },
  })
  // attach parent if exists
  if (parent) {
    await manager.update(Post, txid, { parent })
  // create orphan if no parent
  } else {
    await manager.createQueryBuilder()
      .insert()
      .into(OrphanCR)
      .values({
        createdAt: new Date(time),
        referenceId,
        post: { txid },
        parentSender: { address: recipientAddress },
      })
      .onConflict('("post_txid") DO NOTHING')
      .execute()
  }
}

async function handleExtension (manager: EntityManager, tx: BorkerTx): Promise<void> {

  const { txid, time, nonce, index, senderAddress } = tx

  // find the parent
  const parent = await manager.createQueryBuilder()
    .select('posts')
    .from(Post, 'posts')
    .where('nonce = :nonce', { nonce })
    .andWhere('sender_address = :senderAddress', { senderAddress })
    .andWhere('type != :type', { type: TransactionType.extension })
    .andWhere(`created_at > :cutoff`, { cutoff: getCutoff(new Date(time)) })
    .andWhere(qb => {
      const subQuery = qb.subQuery()
        .select('parent_txid')
        .from(Post, 'posts2')
        .where('type = :type', { type: TransactionType.extension })
        .andWhere('"index" = :index', { index })
        .andWhere('parent_txid IS NOT NULL')
        .getQuery()
      return `txid NOT IN ${subQuery}`
    })
    .orderBy('posts.createdAt', 'DESC')
    .getOne()

  // attach/detach parent
  await manager.update(Post, txid, { parent })
}

async function handleLike (manager: EntityManager, referenceId: string, senderAddress: string, recipientAddress: string): Promise<void> {
  // if either party is blocked, return
  if (await eitherPartyBlocked(recipientAddress, senderAddress)) { return }
  // find the parent
  const parent = await manager.findOne(Post, {
    where: {
      txid: Like(`${referenceId}%`),
      sender: { address: recipientAddress },
    },
    order: { createdAt: 'DESC' },
  })
  // @TODO handle orphan case...somehow
  if (!parent) { return }

  await manager.createQueryBuilder()
    .insert()
    .into('likes')
    .values({
      user_address: senderAddress,
      post_txid: parent.txid,
    })
    .onConflict('DO NOTHING')
    .execute()
}

async function handleFUU (manager: EntityManager, type: TransactionType, senderAddress: string, content: string): Promise<void> {
  // find the post from the content of the tx
  const parent = await manager.findOne(Post, content)
  if (!parent) { return }

  switch (type) {
    case TransactionType.flag:
      // if either party is blocked, they cannot flag
      if (await eitherPartyBlocked(parent.senderAddress, senderAddress)) { return }
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
    case TransactionType.unflag:
      await manager.createQueryBuilder()
        .relation(User, 'flags')
        .of(senderAddress)
        .remove(parent.txid)
      break
    case TransactionType.unlike:
      await manager.createQueryBuilder()
        .relation(User, 'likes')
        .of(senderAddress)
        .remove(parent.txid)
      break
  }
}

async function handleFUBU (manager: EntityManager, type: TransactionType, senderAddress: string, recipientAddress: string): Promise<void> {
  // get the user from the content of the post
  const recipient = await manager.findOne(User, recipientAddress)
  if (!recipient) { return }

  switch (type) {
    // follow
    case TransactionType.follow:
      await manager.createQueryBuilder()
        .insert()
        .into('follows')
        .values({
          follower_address: senderAddress,
          followed_address: recipientAddress,
        })
        .onConflict('DO NOTHING')
        .execute()
      break
    // unfollow
    case TransactionType.unfollow:
      await manager.createQueryBuilder()
        .relation(User, 'following')
        .of(senderAddress)
        .remove(recipientAddress)
      break
    // block
    case TransactionType.block:
      await manager.createQueryBuilder()
        .insert()
        .into('blocks')
        .values({
          blocker_address: senderAddress,
          blocked_address: recipientAddress,
        })
        .onConflict('DO NOTHING')
        .execute()
      break
    // unblock
    case TransactionType.unblock:
      await manager.createQueryBuilder()
        .relation(User, 'blocking')
        .of(senderAddress)
        .remove(recipientAddress)
      break
  }
}

function getCutoff (now: Date): Date {
  return new Date(now.setHours(now.getHours() - 24))
}

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
