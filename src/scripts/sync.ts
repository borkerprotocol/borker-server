import * as rpc from '../util/rpc-requests'
import * as fs from 'fs'
import { getRepository } from 'typeorm'
import { Transaction, TransactionType } from '../db/entities/transaction'
import { User } from '../db/entities/user'
import { mockTxs1, mockTxs2, mockTxs3, MappedTx } from '../util/mocks'
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

  await createTransactions(txs)

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

async function createTransactions (mappedTxs: MappedTx[]) {

  for (let mappedTx of mappedTxs) {

    const { txid, timestamp, nonce, referenceNonce, type, content, value, fee, senderAddress, recipientAddress } = mappedTx
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
      value,
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

    // attach recipient and update earnings
    if (recipientAddress) {
      tx.recipient = await userRepo.findOne(recipientAddress)
      tx.recipient.earnings = (tx.recipient.earnings).plus(tx.value)
    }

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
        tx.sender.following = [tx.recipient]
        tx.sender.followingCount = tx.sender.followingCount + 1
        tx.recipient.followersCount = tx.recipient.followersCount + 1
        break
      // unfollow
      case TransactionType.unfollow:
        await userRepo
          .createQueryBuilder()
          .relation(User, 'following')
          .of(tx.sender)
          .remove(tx.recipient)
        tx.sender.followingCount = tx.sender.followingCount - 1
        tx.recipient.followersCount = tx.recipient.followersCount - 1
        break
      // comment, like, rebork
      case TransactionType.comment:
      case TransactionType.like:
      case TransactionType.rebork:
        // add the parent no mater what
        tx.parent = await txRepo.findOne({ nonce: referenceNonce, sender: tx.recipient })
        tx.parent.earnings = tx.parent.earnings.plus(tx.value)
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

    await txRepo.save(tx)
  }
}
