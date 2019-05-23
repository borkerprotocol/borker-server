import * as rpc from '../util/rpc-requests'
import * as fs from 'fs'
import { getManager, EntityManager } from 'typeorm'
import { Transaction, TransactionType } from '../db/entities/transaction'
import { User } from '../db/entities/user'
import { BorkerTx, mockTxs1, mockTxs2, mockTxs3, mockTxs4, mockCreated1, mockCreated2, mockSpent1, mockSpent2, mockCreated3, mockCreated4, mockSpent3, mockSpent4, Spent } from '../util/mocks'
import { Tag } from '../db/entities/tag'
import { Utxo, UtxoSeed } from '../db/entities/utxo'

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

  // const { borkerTxs: BorkerTx[], created: UtxoSeed[], spent: Spent[] } = borkerLib.processBlock(block)
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
  await manager.save(manager.create(Utxo, created))
  await manager.remove(Utxo, spent)
}

async function processBorkerTxs(manager: EntityManager, borkerTxs: BorkerTx[]) {

  for (let borkerTx of borkerTxs) {

    const { txid, time, nonce, referenceNonce, type, content, fee, value, senderAddress, recipientAddress, mentions } = borkerTx

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

    // attach sender - find or create
    tx.sender = await manager.findOne(User, senderAddress) || manager.create(User, {
      address: senderAddress,
      createdAt: new Date(time),
      birthBlock: blockHeight,
      name: senderAddress.substr(0, 9),
    })

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

    // attach tags and mentions
    if (
      type === TransactionType.bork ||
      type === TransactionType.extension ||
      type === TransactionType.rebork ||
      type === TransactionType.comment
    ) {
      await Promise.all([
        attachTags(manager, tx),
        attachMentions(manager, tx, mentions),
      ])
    }

    await manager.save(tx)
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

async function attachTags(manager: EntityManager, tx: Transaction): Promise<void> {
  const regex = /(?:^|\s)(?:#)([a-zA-Z\d]+)/gm
  let match: RegExpExecArray

  tx.tags = []

  while ((match = regex.exec(tx.content))) {
    const name = match[1].toLowerCase()
    const tag = await manager.findOne(Tag, name) || manager.create(Tag, {
      name,
      createdAt: new Date(tx.createdAt),
    })
    tx.tags.push(tag)
  }
}

async function attachMentions(manager: EntityManager, tx: Transaction, mentions: string[]): Promise<void> {
  tx.mentions = []
  await Promise.all(mentions.map(async address => {
    const user = await manager.findOne(User, address)
    if (!user) { return }
    tx.mentions.push(user)
  }))
}
