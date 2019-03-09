import * as rpc from '../util/rpc-requests'
import * as fs from 'fs'
import { getManager, EntityManager } from 'typeorm'
import { Transaction, TransactionType } from '../db/entities/transaction'
import { User } from '../db/entities/user'
import { mockTxs1, mockTxs2, mockTxs3, MappedTx, mockTxs4 } from '../util/mocks'
import { Tag } from '../db/entities/tag'
import { Mention } from '../db/entities/mention'
import BigNumber from 'bignumber.js'

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

  // const txs: rpc.MappedTx[] = borkerLib.processBlock(serializedBlock)
  const txs: MappedTx[] = getTxs()

  await processTransactions(txs)

  blockHeight++
  await processBlocks()
}

// TODO delete this function once borkerLib is available
function getTxs () {
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

async function processTransactions (mappedTxs: MappedTx[]) {

  for (let mappedTx of mappedTxs) {

    const { txid, timestamp, nonce, referenceNonce, type, content, fee, senderAddress, outputs } = mappedTx

    // continue if we've already seen this txid
    if (await getManager().findOne(Transaction, txid)) { continue }

    await getManager().transaction(async manager => {

      // create tx
      let tx = manager.create(Transaction, {
        txid,
        createdAt: new Date(timestamp),
        nonce,
        type,
        content,
        fee,
      })

      // attach sender
      tx.sender = await manager.findOne(User, senderAddress)
      // create sender if not exists
      if (!tx.sender) {
        tx.sender = manager.create(User, {
          address: senderAddress,
          createdAt: new Date(timestamp),
          birthBlock: blockHeight,
          name: senderAddress.substr(0, 9),
        })
      }

      // attach mentions
      tx.mentions = []
      for (let output of outputs) {
        // create the mention and add it to the tx
        tx.mentions.push(manager.create(Mention, {
          createdAt: tx.createdAt,
          value: new BigNumber(output.value),
          user: { address: output.address },
        }))
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
        // comment, like, rebork, flag
        case TransactionType.comment:
        case TransactionType.like:
        case TransactionType.rebork:
        case TransactionType.flag:
          await handleCLRF(manager, tx, referenceNonce)
          break
        // extension
        case TransactionType.extension:
          tx.parent = await manager.findOne(Transaction, { nonce: referenceNonce, sender: tx.sender })
          break
        // bork
        default:
          break
      }

      // attach tags if taggable type
      if (
        type === TransactionType.bork ||
        type === TransactionType.extension ||
        type === TransactionType.rebork ||
        type === TransactionType.comment
      ) {
        tx.tags = await attachTags(manager, tx)
      }

      await manager.save(tx)
    })
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

async function handleCLRF (manager: EntityManager, tx: Transaction, referenceNonce: number) {
  // attach the parent
  tx.parent = await manager.findOne(Transaction, { nonce: referenceNonce, sender: tx.mentions[0].user })
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
    // flag
    case TransactionType.flag:
      tx.parent.flagsCount = tx.parent.flagsCount + 1
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
