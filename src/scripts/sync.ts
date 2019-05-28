import * as rpc from '../util/rpc-requests'
import * as fs from 'fs'
import { getManager, EntityManager, Like } from 'typeorm'
import { Post, PostType } from '../db/entities/post'
import { User } from '../db/entities/user'
import { Tag } from '../db/entities/tag'
import { Utxo } from '../db/entities/utxo'
import { eitherPartyBlocked, chunks } from '../util/functions'
import { OrphanCR } from '../db/entities/orphan-cr'
import { processBlock, Network, BorkType, BorkTxData, UtxoId, NewUtxo } from 'borker-rs-node'
// import { getMockBorkerTxs, getMockCreated, getMockSpent } from '../util/mocks'

let config = JSON.parse(fs.readFileSync('borkerconfig.json', 'utf8'))
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
    setTimeout(syncChain, 4000)
  }
}

async function processBlocks () {
  console.log(`syncing block ${blockHeight}`)

  let blockHash: string
  try {
    blockHash = await rpc.getBlockHash(blockHeight)
  } catch (err) {
    return
  }

  const block = await rpc.getBlock(blockHash)

  const { borkerTxs, created, spent } = processBlock(block, Network.Dogecoin)
  // const borkerTxs = getMockBorkerTxs(blockHeight)
  // const created = getMockCreated(blockHeight)
  // const spent = getMockSpent(blockHeight)

  await getManager().transaction(async manager => {
    await Promise.all([
      processUtxos(manager, created, spent),
      processBorkerTxs(manager, borkerTxs),
    ])
  })

  blockHeight++

  config = JSON.parse(fs.readFileSync('borkerconfig.json', 'utf8'))
  config.startBlockSync = blockHeight
  fs.writeFileSync('borkerconfig.json', JSON.stringify(config, null, 2), 'utf8')

  await processBlocks()
}

async function processUtxos(manager: EntityManager, created: NewUtxo[], spent: UtxoId[]) {
  // insert created utxos
  if (created.length) {
    await Promise.all(chunks(created, 100).map(chunk => {
      return manager.createQueryBuilder()
        .insert()
        .into(Utxo)
        .values(chunk)
        .onConflict('("txid", "index") DO NOTHING')
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
      case BorkType.SetName:
      case BorkType.SetBio:
      case BorkType.SetAvatar:
        await handleProfileUpdate(manager, type, senderAddress, content)
        break
      // if bork, comment, rebork, extension
      case BorkType.Bork:
      case BorkType.Comment:
      case BorkType.Rebork:
      case BorkType.Extension:
        await handleBCRE(manager, tx)
        break
      // like
      case BorkType.Like:
        await handleLike(manager, referenceId, senderAddress, recipientAddress)
        break
      // flag, unflag, unlike
      case BorkType.Unlike:
      case BorkType.Flag:
      case BorkType.Unflag:
        await handleFUU(manager, type, senderAddress, content)
        break
      case BorkType.Follow:
      case BorkType.Unfollow:
      case BorkType.Block:
      case BorkType.Unblock:
        await handleFUBU(manager, type, senderAddress, content)
        break
      case BorkType.Delete:
        await manager.update(Post, { sender: { address: senderAddress }, txid: content }, { content: null, deletedAt: new Date(time) })
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

async function handleBCRE (manager: EntityManager, tx: BorkTxData): Promise<void> {

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
      .andWhere('type = :type', { type: BorkType.Extension })
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
    (type === BorkType.Comment || type === BorkType.Rebork) && handleCR(manager, tx),
    // if extension
    type === BorkType.Extension && handleExtension(manager, tx),
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

async function handleCR (manager: EntityManager, tx: BorkTxData): Promise<void> {

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

async function handleExtension (manager: EntityManager, tx: BorkTxData): Promise<void> {

  const { txid, time, nonce, index, senderAddress } = tx

  // find the parent
  const parent = await manager.createQueryBuilder()
    .select('posts')
    .from(Post, 'posts')
    .where('nonce = :nonce', { nonce })
    .andWhere('sender_address = :senderAddress', { senderAddress })
    .andWhere('type != :type', { type: BorkType.Extension })
    .andWhere(`created_at > :cutoff`, { cutoff: getCutoff(new Date(time)) })
    .andWhere(qb => {
      const subQuery = qb.subQuery()
        .select('parent_txid')
        .from(Post, 'posts2')
        .where('type = :type', { type: BorkType.Extension })
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

async function handleFUU (manager: EntityManager, type: BorkType, senderAddress: string, content: string): Promise<void> {
  // find the post from the content of the tx
  const parent = await manager.findOne(Post, content)
  if (!parent) { return }

  switch (type) {
    case BorkType.Flag:
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
    case BorkType.Unflag:
      await manager.createQueryBuilder()
        .relation(User, 'flags')
        .of(senderAddress)
        .remove(parent.txid)
      break
    case BorkType.Unlike:
      await manager.createQueryBuilder()
        .relation(User, 'likes')
        .of(senderAddress)
        .remove(parent.txid)
      break
  }
}

async function handleFUBU (manager: EntityManager, type: BorkType, senderAddress: string, recipientAddress: string): Promise<void> {
  // get the user from the content of the post
  const recipient = await manager.findOne(User, recipientAddress)
  if (!recipient) { return }

  switch (type) {
    // follow
    case BorkType.Follow:
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
    case BorkType.Unfollow:
      await manager.createQueryBuilder()
        .relation(User, 'following')
        .of(senderAddress)
        .remove(recipientAddress)
      break
    // block
    case BorkType.Block:
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
    case BorkType.Unblock:
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
