import * as rpc from '../util/rpc-requests'
import * as fs from 'fs'
import { getManager, EntityManager } from 'typeorm'
import { Transaction, TransactionType } from '../db/entities/transaction'
import { User } from '../db/entities/user'
import { BorkerTx, StandardTx, mockTxs1, mockTxs2, mockTxs3, mockTxs4, standardTxs1 } from '../util/mocks'
import { Tag } from '../db/entities/tag'
import { Utxo } from '../db/entities/utxo'

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

  const serializedBlock = await rpc.getBlock(blockHash)

  // const { borkerTxs: BorkerTx[], txs } = borkerLib.processBlock(serializedBlock)
  const borkerTxs: BorkerTx[] = getBorkerTxs()
  const standardTxs: StandardTx[] = getStandardTxs()

  await getManager().transaction(async manager => {
    await Promise.all([
      processBorkerTxs(manager, borkerTxs),
      processStandardTxs(manager, standardTxs),
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
  } else {
    return mockTxs4
  }
}

// TODO delete this function once borkerLib is available
function getStandardTxs () {
  if (blockHeight === 17903) {
    return standardTxs1
  } else {
    return []
  }
}

async function processBorkerTxs(manager: EntityManager, borkerTxs: BorkerTx[]) {

  for (let borkerTx of borkerTxs) {

    const { txid, time, nonce, referenceNonce, type, content, fee, value, senderAddress, recipientAddress } = borkerTx

    // continue if we've already seen this txid
    if (await manager.findOne(Transaction, txid)) { continue }

    // create tx
    let tx = manager.create(Transaction, {
      txid,
      createdAt: new Date(time),
      nonce,
      type,
      content,
      fee,
      value,
    })

    // attach sender
    tx.sender = await manager.findOne(User, senderAddress)
    // create sender if not exists
    if (!tx.sender) {
      tx.sender = manager.create(User, {
        address: senderAddress,
        createdAt: new Date(time),
        birthBlock: blockHeight,
        name: senderAddress.substr(0, 9),
      })
    }

    // case on the transaction type
    switch (type) {
      // set name
      case TransactionType.setName:
        tx.sender.name = content
        break
      // set bio
      case TransactionType.setBio:
        tx.sender.bio = content
        break
      // set avatar
      case TransactionType.setAvatar:
        tx.sender.avatarLink = content
        break
      // follow
      case TransactionType.follow:
      case TransactionType.unfollow:
      case TransactionType.block:
      case TransactionType.unblock:
        await handleFUBU(manager, tx)
        break
      // comment, like, rebork
      case TransactionType.comment:
      case TransactionType.like:
      case TransactionType.rebork:
        await handleCLR(manager, tx, recipientAddress, referenceNonce)
        break
      // flag
      case TransactionType.flag:
        tx.parent = await manager.findOne(Transaction, tx.content)
        if (!tx.parent) { break }
        tx.parent.flagsCount = tx.parent.flagsCount + 1
        break
      // extension
      case TransactionType.extension:
        tx.parent = await manager.findOne(Transaction, { nonce: referenceNonce, sender: tx.sender })
        break
      // bork
      default:
        break
    }

    // attach tags and mentions if post type
    if (
      type === TransactionType.bork ||
      type === TransactionType.extension ||
      type === TransactionType.rebork ||
      type === TransactionType.comment
    ) {
      const [tags, mentions] = await Promise.all([
        attachTags(manager, tx),
        attachMentions(manager, tx),
      ])
      tx.tags = tags
      tx.mentions = mentions
    }

    await manager.save(tx)
  }
}

async function processStandardTxs(manager: EntityManager, txs: StandardTx[]) {
  for (let tx of txs) {

    const { txid, hex, time, inputs, outputs } = tx

    for (let input of inputs) {
      const { txid: refTxid, index } = input
      await manager.remove(Utxo, { txid: refTxid, index })
    }

    for (let output of outputs) {
      const { value, index, address } = output
      const utxo = manager.create(Utxo, {
        txid,
        index,
        createdAt: new Date(time),
        address,
        value: value,
        raw: hex,
      })
      await manager.save(utxo)
    }
  }
}

async function handleFUBU (manager: EntityManager, tx: Transaction) {
  // get the user from the content of the post
  const recipient = await manager.findOne(User, tx.content)
  if (!recipient) { return }

  switch (tx.type) {
    // follow
    case TransactionType.follow:
      tx.sender.following = [recipient]
      tx.sender.followingCount = tx.sender.followingCount + 1
      await manager.update(User, recipient.address, { followersCount: recipient.followersCount + 1 })
      break
    // unfollow
    case TransactionType.unfollow:
      await manager
        .createQueryBuilder()
        .relation(User, 'following')
        .of(tx.sender)
        .remove(recipient)
      tx.sender.followingCount = tx.sender.followingCount - 1
      await manager.update(User, recipient.address, { followersCount: recipient.followersCount - 1 })
      break
    // block
    case TransactionType.block:
      tx.sender.blocking = [recipient]
      break
    // unblock
    case TransactionType.unblock:
      await manager
        .createQueryBuilder()
        .relation(User, 'blocking')
        .of(tx.sender)
        .remove(recipient)
      break
  }
}

async function handleCLR (manager: EntityManager, tx: Transaction, recipientAddress: string, referenceNonce: number) {
  // attach the parent
  tx.parent = await manager.findOne(Transaction, { nonce: referenceNonce, sender: { address: recipientAddress } })
  // return if parent not found
  if (!tx.parent) { return }
  // increment the appropriate count
  switch (tx.type) {
    // comment
    case TransactionType.comment:
      tx.parent.commentsCount = tx.parent.commentsCount + 1
      break
    // like
    case TransactionType.like:
      tx.parent.likesCount = tx.parent.likesCount + 1
      break
    // rebork
    case TransactionType.rebork:
      tx.parent.reborksCount = tx.parent.reborksCount + 1
      break
  }
}

async function attachTags(manager: EntityManager, tx: Transaction): Promise<Tag[]> {  
  const regex = /(?:^|\s)(?:#)([a-zA-Z\d]+)/gm
  let tags: Tag[] = []
  let match: RegExpExecArray

  while ((match = regex.exec(tx.content))) {
    const name = match[1].toLowerCase()
    const tag = await manager.findOne(Tag, name) || manager.create(Tag, {
      name,
      createdAt: new Date(tx.createdAt),
    })
    tags.push(tag)
  }

  return tags
}

async function attachMentions(manager: EntityManager, tx: Transaction): Promise<User[]> {  
  const regex = /(?:^|\s)(?:@)([a-zA-Z0-9_\d]+)/gm
  let mentions: User[] = []
  let match: RegExpExecArray

  while ((match = regex.exec(tx.content))) {
    const name = match[1]
    const user = await manager.findOne(User, { name })
    if (!user) { return }
    mentions.push(user)
  }

  return mentions
}
