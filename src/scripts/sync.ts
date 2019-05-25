import * as rpc from '../util/rpc-requests'
import * as fs from 'fs'
import { getManager, EntityManager } from 'typeorm'
import { Post, PostType } from '../db/entities/post'
import { User } from '../db/entities/user'
import { BorkerTx, mockTxs1, mockTxs2, mockTxs3, mockTxs4, mockCreated1, mockCreated2, mockSpent1, mockSpent2, mockCreated3, mockCreated4, mockSpent3, mockSpent4, Spent, TransactionType } from '../util/mocks'
import { Tag } from '../db/entities/tag'
import { Utxo, UtxoSeed } from '../db/entities/utxo'
import { eitherPartyBlocked, checkBlocked } from '../util/functions'

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
  await manager.save(manager.create(Utxo, created))
  await manager.remove(Utxo, spent)
}

async function processBorkerTxs(manager: EntityManager, borkerTxs: BorkerTx[]) {

  for (let tx of borkerTxs) {

    const { txid, time, nonce, referenceNonce, type, content, senderAddress, recipientAddress, mentions } = tx

    // find or create sender
    let sender = await manager.findOne(User, senderAddress) || await manager.save(manager.create(User, {
      address: senderAddress,
      createdAt: new Date(time),
      birthBlock: blockHeight,
      name: senderAddress.substr(0, 9),
    }))

    switch (type) {
      // if set_name, set_bio, set_avatar
      case TransactionType.setName:
      case TransactionType.setBio:
      case TransactionType.setAvatar:
        await handleProfileUpdate(manager, type, sender, content)
        break
      // if bork, comment, wag, extension
      case TransactionType.bork:
      case TransactionType.comment:
      case TransactionType.wag:
      case TransactionType.extension:
        // create post
        let post = manager.create(Post, {
          txid,
          createdAt: new Date(time),
          nonce,
          type: PostType[type],
          content,
          sender,
        })
        // if comment, wag
        if (type === TransactionType.comment || type === TransactionType.wag) {
          // attach the parent
          post.parent = await manager.findOne(Post, { nonce: referenceNonce, sender: { address: recipientAddress } })
          // break before saving if either party is blocked
          if (await eitherPartyBlocked(recipientAddress, sender.address)) { break }
        // if extension
        } else if (type === TransactionType.extension) {
          post.parent = await manager.findOne(Post, { nonce: referenceNonce, sender })
        }
        await manager.save(post)
        await Promise.all([
          attachTags(manager, post),
          attachMentions(manager, post, mentions),
        ])
        break
      case TransactionType.flag:
      case TransactionType.unflag:
        // find the post from the content of the tx
        let post2 = await manager.findOne(Post, content)
        if (!post2) { break }
        if (type === TransactionType.flag) {
          // if either party is blocked, they cannot flag
          if (await eitherPartyBlocked(recipientAddress, sender.address)) { break }
          await manager
            .createQueryBuilder()
            .insert()
            .into('flags')
            .values([{ user_address: sender.address, post_txid: post2.txid }])
            .onConflict('DO NOTHING')
            .execute()
        } else {
          await manager
            .createQueryBuilder()
            .relation(User, 'flags')
            .of(sender)
            .remove(post2)
        }
        break
      case TransactionType.follow:
      case TransactionType.unfollow:
      case TransactionType.block:
      case TransactionType.unblock:
        await handleFUBU(manager, type, sender, content)
        break
      case TransactionType.delete:
        await manager.update(Post, { sender, txid: content }, { content: null, deletedAt: new Date(time) })
        break
    }
  }
}

async function handleProfileUpdate(manager: EntityManager, type: TransactionType, user: User, content: string) {
  switch (type) {
    case TransactionType.setName:
      user.name = content
      break
    case TransactionType.setBio:
      user.bio = content
      break
    case TransactionType.setAvatar:
      user.avatarLink = content
      break
  }

  await manager.save(user)
}

async function handleFUBU (manager: EntityManager, type: TransactionType, sender: User, recipientAddress: string) {
  // get the user from the content of the post
  const recipient = await manager.findOne(User, recipientAddress)
  if (!recipient) { return }

  switch (type) {
    // follow
    case TransactionType.follow:
      await manager
        .createQueryBuilder()
        .insert()
        .into('follows')
        .values({ follower_address: sender.address, followed_address: recipientAddress })
        .onConflict('DO NOTHING')
        .execute()
      break
    // unfollow
    case TransactionType.unfollow:
      await manager
        .createQueryBuilder()
        .relation(User, 'following')
        .of(sender)
        .remove(recipient)
      break
    // block
    case TransactionType.block:
      await manager
        .createQueryBuilder()
        .insert()
        .into('blocks')
        .values([{ blocker_address: sender.address, blocked_address: recipientAddress }])
        .onConflict('DO NOTHING')
        .execute()
      break
    // unblock
    case TransactionType.unblock:
      await manager
        .createQueryBuilder()
        .relation(User, 'blocking')
        .of(sender)
        .remove(recipient)
      break
  }
}

async function attachTags (manager: EntityManager, post: Post): Promise<void> {
  const regex = /(?:^|\s)(?:#)([a-zA-Z\d]+)/gm
  let match: RegExpExecArray

  let postTags = []

  // limit post tags to 10
  while ((match = regex.exec(post.content)) && postTags.length < 11) {
    const name = match[1].toLowerCase()
    const tag = await manager.findOne(Tag, name) || await manager.save(manager.create(Tag, {
      name,
      createdAt: new Date(post.createdAt),
    }))
    postTags.push({ tag_name: tag, post_txid: post.txid })
  }

  if (postTags.length) {
    await manager
      .createQueryBuilder()
      .insert()
      .into('post_tags')
      .values(postTags)
      .onConflict('DO NOTHING')
      .execute()
  }
}

async function attachMentions (manager: EntityManager, post: Post, unverified: string[]): Promise<void> {
  let mentions = []
  await Promise.all(unverified.map(async address => {
    const user = await manager.findOne(User, address)
    if (!user) { return }
    mentions.push({ user_address: address, post_txid: post.txid })
  }))

  if (mentions.length) {
    await manager
      .createQueryBuilder()
      .insert()
      .into('mentions')
      .values(mentions)
      .onConflict('DO NOTHING')
      .execute()
  }
}
