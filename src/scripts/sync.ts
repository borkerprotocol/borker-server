import * as rpc from '../util/rpc-requests'
import * as fs from 'fs'
import { getRepository } from 'typeorm'
import { Transaction, TransactionType } from '../db/entities/transaction'
import { User } from '../db/entities/user'
import { mockTxs1, mockTxs2, mockTxs3, MappedTx } from '../util/mocks'
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

  const rawBlock = await rpc.getBlock(blockHash)

  // const txs: rpc.MappedTx[] = borkerLib.processBlock(rawBlock)
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
  } else {
    return mockTxs3
  }
}

async function processTransactions (mappedTxs: MappedTx[]) {

  for (let mappedTx of mappedTxs) {

    const { txid, timestamp, nonce, referenceNonce, type, content, fee, senderAddress, outputs } = mappedTx
    const txRepo = getRepository(Transaction)
    const userRepo = getRepository(User)

    // continue if we've already seen this txid
    if (await txRepo.findOne(txid)) continue

    let tx = txRepo.create({
      txid,
      createdAt: new Date(timestamp),
      nonce,
      type,
      content,
      fee,
    })

    // attach sender
    tx.sender = await userRepo.findOne(senderAddress)
    // create sender if not exists
    if (!tx.sender) {
      tx.sender = userRepo.create({
        address: senderAddress,
        createdAt: new Date(timestamp),
        birthBlock: blockHeight,
      })
    }

    // attach mentions and update recipient earnings
    tx.mentions = []
    for (let output of outputs) {
      let user = await userRepo.findOne(output.address)
      if (!user) { continue }

      user.earnings = user.earnings.plus(output.value)
      // create the mention and add it o the tx
      tx.mentions.push(getRepository(Mention).create({
        createdAt: tx.createdAt,
        value: new BigNumber(output.value),
        user,
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
        tx.sender.following = [tx.mentions[0].user]
        tx.sender.followingCount = tx.sender.followingCount + 1
        tx.mentions[0].user.followersCount = tx.mentions[0].user.followersCount + 1
        break
      // unfollow
      case TransactionType.unfollow:
        await userRepo
          .createQueryBuilder()
          .relation(User, 'following')
          .of(tx.sender)
          .remove(tx.mentions[0].user)
        tx.sender.followingCount = tx.sender.followingCount - 1
        tx.mentions[0].user.followersCount = tx.mentions[0].user.followersCount - 1
        break
      // comment, like, rebork
      case TransactionType.comment:
      case TransactionType.like:
      case TransactionType.rebork:
        // add the parent no mater what
        tx.parent = await txRepo.findOne({ nonce: referenceNonce, sender: tx.mentions[0].user })
        tx.parent.earnings = tx.parent.earnings.plus(tx.mentions[0].value)
        // increment the appropriate count
        if (type === TransactionType.comment) {
          tx.parent.commentsCount = tx.parent.commentsCount + 1
        } else if (type === TransactionType.like) {
          tx.parent.likesCount = tx.parent.likesCount + 1
        } else {
          tx.parent.reborksCount = tx.parent.reborksCount + 1
        }
        break
      // extension
      case TransactionType.extension:
        tx.parent = await txRepo.findOne({ nonce: referenceNonce, sender: tx.sender })
        break
      // bork
      default:
        break
    }

    if (
      type === TransactionType.bork ||
      type === TransactionType.extension ||
      type === TransactionType.rebork ||
      type === TransactionType.comment
    ) {
      tx.tags = await getTags(tx)
    }

    await txRepo.save(tx)
  }
}

async function getTags(tx: Transaction): Promise<Tag[]> {  
  const regex = /(?:^|\s)(?:#)([a-zA-Z\d]+)/gm
  let tags: Tag[] = []
  let match: RegExpExecArray

  while ((match = regex.exec(tx.content))) {
    const name = match[1].toLowerCase()
    const tag = await getRepository(Tag).findOne(name) || getRepository(Tag).create({
      name,
      createdAt: new Date(tx.createdAt),
    })
    tags.push(tag)
  }

  return tags
}
