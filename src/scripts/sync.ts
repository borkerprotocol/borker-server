import * as rpc from '../util/rpc-requests'
import * as fs from 'fs'
import { getRepository } from 'typeorm'
import { Transaction, TransactionType } from '../db/entities/transaction'
import { User } from '../db/entities/user'
import { mockTxs1, mockTxs2, mockTxs3, MappedTx } from '../util/mocks'

// let borkerLib: any

const path = 'borkerconfig.json'
const config = JSON.parse(fs.readFileSync(path, 'utf8'))

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
    fs.writeFileSync(path, JSON.stringify(config, null, 2), 'utf8')
  }
}

async function processBlocks () {
  console.log(`syncing block ${blockHeight}`)

  const blockHash = await rpc.getBlockHash(blockHeight)
  if (!blockHash) return

  const rawBlock = await rpc.getBlock(blockHash)

  // const txs: rpc.MappedTx[] = borkerLib.processBlock(rawBlock)
  const txs: MappedTx[] = getTxs(rawBlock)

  await createTransactions(txs)

  blockHeight++
  await processBlocks()
}

function getTxs (rawBlock: string) {
  console.log(`returning txs for block hash ${rawBlock}`)
  if (blockHeight === 17903) {
    return mockTxs1
  } else if (blockHeight === 17904) {
    return mockTxs2
  } else {
    return mockTxs3
  }
}

async function createTransactions (txs: MappedTx[]) {
  for (let tx of txs) {
    const { txid, timestamp, nonce, referenceNonce, type, content, value, fee, senderAddress, recipientAddress } = tx
    const transactionRepo = getRepository(Transaction)
    const userRepo = getRepository(User)

    // continue if we've already seen this txid
    if (await transactionRepo.findOne(txid)) continue

    let transaction = transactionRepo.create({
      txid,
      createdAt: new Date(timestamp),
      nonce,
      type,
      content,
      value,
      fee,
    })

    // attach sender
    transaction.sender = await userRepo.findOne(senderAddress)
    // create sender if not exists
    if (!transaction.sender) {
      const user = await userRepo.create({
        address: senderAddress,
        createdAt: new Date(timestamp),
        birthBlock: blockHeight,
      })
      transaction.sender = await userRepo.save(user)
    }

    // attach recipient
    if (recipientAddress) {
      transaction.recipient = await userRepo.findOne(recipientAddress)
    }

    switch (type) {
      // set name
      case TransactionType.setName:
        userRepo.update(senderAddress, { name: content })
        break
      // set bio
      case TransactionType.setBio:
        userRepo.update(senderAddress, { bio: content })
        break
      // set avatar
      case TransactionType.setAvatar:
        userRepo.update(senderAddress, { avatarLink: content })
        break
      // follow
      case TransactionType.follow:
        transaction.sender.following = [transaction.recipient]
        transaction.sender.followingCount = transaction.sender.followingCount + 1
        transaction.recipient.followersCount = transaction.recipient.followersCount + 1
        await userRepo.save([transaction.sender, transaction.recipient])
        break
      // unfollow
      case TransactionType.unfollow:
        await userRepo
          .createQueryBuilder()
          .relation(User, 'following')
          .of(transaction.sender)
          .remove(transaction.recipient)
        transaction.sender.followingCount = transaction.sender.followingCount - 1
        transaction.recipient.followersCount = transaction.recipient.followersCount - 1
        await userRepo.save([transaction.sender, transaction.recipient])
        break
      // comment, like, rebork
      case TransactionType.comment:
      case TransactionType.like:
      case TransactionType.rebork:
        // add the parent no mater what
        const parent = await transactionRepo.findOne({ nonce: referenceNonce, sender: transaction.recipient })
        transaction.parent = parent
        let data: {}
        // increment the appropriate count
        if (type === TransactionType.comment) {
          data = { commentsCount: parent.commentsCount + 1 }
        } else if (type === TransactionType.like) {
          data = { likesCount: parent.likesCount + 1 }
        } else {
          data = { reborksCount: parent.reborksCount + 1 }
        }
        await transactionRepo.update(parent.txid, data)
        break
      // extension
      case TransactionType.extension:
        transaction.parent = await transactionRepo.findOne({ nonce: referenceNonce, sender: transaction.sender })
        break
      // bork
      default:
        break
    }

    await transactionRepo.save(transaction)
  }
}
