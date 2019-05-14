import { TransactionType } from '../db/entities/transaction'

export interface BorkerTx {
  time: number
  txid: string
  type: TransactionType
  nonce: number
  referenceNonce: number | null
  content: string | null
  fee: number
  value: number
  senderAddress: string
  recipientAddress: string
}

export interface StandardTx {
  hex: string
  txid: string
  inputs: Input[],
  outputs: Output[],
  time: number
}

export interface Input {
  txid: string
  index: number
}

export interface Output {
  value: number
  index: number
  address: string,
}

export const mockTxs1: BorkerTx[] = [
  {
    time: 1412177231000,
    txid: '39128e8edacce1ada4e1df9aa5fc91431302ef951df06a78e13f4fbc3759e752',
    type: TransactionType.setName,
    nonce: 0,
    referenceNonce: null,
    content: 'MattHill',
    fee: 100000000,
    value: 0,
    senderAddress: 'DSJdZogGLmREMZTyJGSzSs2RL9UJjeqKd7',
    recipientAddress: null,
  },
  {
    time: 1422182926000,
    txid: '8b5ab18a8593ba3f1abae61c07bf02169487c58b0e244922b6c4578eaf6e0d35',
    type: TransactionType.bork,
    nonce: 1,
    referenceNonce: null,
    content: 'I like to bork. I like to bork',
    fee: 100000000,
    value: 0,
    senderAddress: 'DSJdZogGLmREMZTyJGSzSs2RL9UJjeqKd7',
    recipientAddress: null,
  },
  {
    time: 1422184977000,
    txid: '774bef2197e6394112e1ee18246f1a0137ddb19a4d2d4464c1e25217977a0460',
    type: TransactionType.like,
    nonce: 0,
    referenceNonce: 1,
    content: null,
    fee: 100000000,
    value: 2000000000,
    senderAddress: 'D65dwxsVdaCFHUGqAVWKgdddsa9ADxXcGk',
    recipientAddress: 'DSJdZogGLmREMZTyJGSzSs2RL9UJjeqKd7',
  },
  {
    time: 1423181711000,
    txid: '43873bcc83d6d811df6bff1909a5cd3fc98eb84bbaded5a44443fc86f9ef0e3b',
    type: TransactionType.bork,
    nonce: 1,
    referenceNonce: null,
    content: 'Bork some more. Bork some more. #Tomorrow',
    fee: 200000000,
    value: 0,
    senderAddress: 'D65dwxsVdaCFHUGqAVWKgdddsa9ADxXcGk',
    recipientAddress: null,
  },
]

export const mockTxs2: BorkerTx[] = [
  {
    time: 1424167335000,
    txid: '069aa2f138cbdc6ebd379b1e6d1cb7f86c8770ad58be27006671d528a75ba0e3',
    type: TransactionType.bork,
    nonce: 2,
    referenceNonce: null,
    content: 'Borking like there aint no #tomorrow',
    fee: 100000000,
    value: 0,
    senderAddress: 'DSJdZogGLmREMZTyJGSzSs2RL9UJjeqKd7',
    recipientAddress: null,
  },
  {
    time: 1424169440000,
    txid: '41266e19b39dbba35128f3af72299b4636cb9250d81741b5db1987716043a7af',
    type: TransactionType.like,
    nonce: 2,
    referenceNonce: 2,
    content: null,
    fee: 100000000,
    value: 1000000000,
    senderAddress: 'D65dwxsVdaCFHUGqAVWKgdddsa9ADxXcGk',
    recipientAddress: 'DSJdZogGLmREMZTyJGSzSs2RL9UJjeqKd7',
  },
  {
    time: 1424561124000,
    txid: '99f14aa1ac661f932113cbb92cfa7ee1cfc649cbc416f7c6aa43b13ce301d3a4',
    type: TransactionType.comment,
    nonce: 3,
    referenceNonce: 1,
    content: 'And some more!',
    fee: 100000000,
    value: 10000000000,
    senderAddress: 'DSJdZogGLmREMZTyJGSzSs2RL9UJjeqKd7',
    recipientAddress: 'D65dwxsVdaCFHUGqAVWKgdddsa9ADxXcGk',
  },
  {
    time: 1424967992000,
    txid: '164af924f859c9936f3bda737a986a1a85b3708c9b2fd150b36b964b11c858a6',
    type: TransactionType.bork,
    nonce: 3,
    referenceNonce: null,
    content: 'This is a long bork that will take up two whole transactions. I will write',
    fee: 100000000,
    value: 0,
    senderAddress: 'D65dwxsVdaCFHUGqAVWKgdddsa9ADxXcGk',
    recipientAddress: null,
  },
  {
    time: 1425167583000,
    txid: 'e3b3a8bf7e3796d908b731c0d16baba0f1e161b97d917e00cde81ff0f1452fd1',
    type: TransactionType.extension,
    nonce: 4,
    referenceNonce: 3,
    content: 'just a little more. See, I told you. Bork on.',
    fee: 100000000,
    value: 0,
    senderAddress: 'D65dwxsVdaCFHUGqAVWKgdddsa9ADxXcGk',
    recipientAddress: null,
  },
  {
    time: 1425188584000,
    txid: '3ffa42642f6dfd718562b8a6d04c403b20b59fe873eadd1960e402769cee1318',
    type: TransactionType.follow,
    nonce: 5,
    referenceNonce: null,
    content: 'DSJdZogGLmREMZTyJGSzSs2RL9UJjeqKd7',
    fee: 100000000,
    value: 0,
    senderAddress: 'D65dwxsVdaCFHUGqAVWKgdddsa9ADxXcGk',
    recipientAddress: null,
  },
]

export const mockTxs3: BorkerTx[] = [
  {
    time: 1425287522000,
    txid: '4cb6f18366e4a32ff69e681d192aec89a4d8721af544725fe6a02ecde4311605',
    type: TransactionType.setName,
    nonce: 6,
    referenceNonce: null,
    content: 'aiden_mcclelland',
    fee: 100000000,
    value: 0,
    senderAddress: 'D65dwxsVdaCFHUGqAVWKgdddsa9ADxXcGk',
    recipientAddress: null,
  },
  {
    time: 1426287533000,
    txid: 'a21f4c7f2aa418aea0a72e34aa753d5aa0bd77918053da3fe06ecb54145657f2',
    type: TransactionType.comment,
    nonce: 0,
    referenceNonce: 4,
    content: 'Wow @aiden_mcclelland that was so borking cool',
    fee: 230000000,
    value: 905000000,
    senderAddress: 'DDVFpYk4BHKvXQRshzxdaxJ4S13J2YPBfK',
    recipientAddress: 'D65dwxsVdaCFHUGqAVWKgdddsa9ADxXcGk',
  },
  {
    time: 1425399510000,
    txid: '8a3e0fe9ebc5e2fec31b12e7880f0dc184b56fd2d0541fcc3e6c0a1530826913',
    type: TransactionType.setBio,
    nonce: 7,
    referenceNonce: null,
    content: 'I am a Bork Master',
    fee: 100000000,
    value: 0,
    senderAddress: 'D65dwxsVdaCFHUGqAVWKgdddsa9ADxXcGk',
    recipientAddress: null,
  },
  {
    time: 1426287533000,
    txid: 'c7c4e2977cc67cc16ee8fec757a61219deddcc8edfb6e20ab818af29f4be9373',
    type: TransactionType.follow,
    nonce: 0,
    referenceNonce: null,
    content: 'D65dwxsVdaCFHUGqAVWKgdddsa9ADxXcGk',
    fee: 100000000,
    value: 0,
    senderAddress: 'DDVFpYk4BHKvXQRshzxdaxJ4S13J2YPBfK',
    recipientAddress: null,
  },
  {
    time: 1426287533000,
    txid: 'fa98bb524af15f8c336e3a1824e1e80ff97a7be9677db7843a77d132ee4a7f0a',
    type: TransactionType.rebork,
    nonce: 0,
    referenceNonce: 0,
    content: null,
    fee: 100000000,
    value: 100000000000,
    senderAddress: 'DG7z89QMNB7xJr7Z44TwZPd8BUFSBoamW7',
    recipientAddress: 'DDVFpYk4BHKvXQRshzxdaxJ4S13J2YPBfK',
  },
]

export const mockTxs4: BorkerTx[] = [
  {
    time: 1425287522000,
    txid: '0b692b4e683a3ea47f0b3b6a6f30e8cca6efcc78f1c2eb6e35430af9b9415eb5',
    type: TransactionType.setBio,
    nonce: 1,
    referenceNonce: null,
    content: 'I am the unknown Borker who shall someday be known',
    fee: 100000000,
    value: 0,
    senderAddress: 'DG7z89QMNB7xJr7Z44TwZPd8BUFSBoamW7',
    recipientAddress: null,
  },
  {
    time: 1426287533000,
    txid: '3a7f46861703322b75fed4594cd94eb9c04c5a6edb0c1e4ecd1eb91ba2fc4304',
    type: TransactionType.block,
    nonce: 1,
    referenceNonce: null,
    content: 'DG7z89QMNB7xJr7Z44TwZPd8BUFSBoamW7',
    fee: 200000000,
    value: 0,
    senderAddress: 'DDVFpYk4BHKvXQRshzxdaxJ4S13J2YPBfK',
    recipientAddress: null,
  },
  {
    time: 1425399510000,
    txid: '20d721480d0450a1b9666618ee618bfbacde74a4bade40908063c6c344bc7214',
    type: TransactionType.unfollow,
    nonce: 2,
    referenceNonce: null,
    content: 'D65dwxsVdaCFHUGqAVWKgdddsa9ADxXcGk',
    fee: 100000000,
    value: 0,
    senderAddress: 'DDVFpYk4BHKvXQRshzxdaxJ4S13J2YPBfK',
    recipientAddress: null,
  },
  {
    time: 1426287533000,
    txid: '2d9509c33a8e93152a42f2aa048404b304ba858dc0ad8f305ba16223781d46fc',
    type: TransactionType.like,
    nonce: 2,
    referenceNonce: 4,
    content: null,
    fee: 100000000,
    value: 2500000000,
    senderAddress: 'DG7z89QMNB7xJr7Z44TwZPd8BUFSBoamW7',
    recipientAddress: 'D65dwxsVdaCFHUGqAVWKgdddsa9ADxXcGk',
  },
  {
    time: 1426287533000,
    txid: 'f93162e896c44fae41c75b66f2c1aa2eeb6e7de54a21b89075f99a90f582434e',
    type: TransactionType.like,
    nonce: 4,
    referenceNonce: 0,
    content: null,
    fee: 100000000,
    value: 4400000000,
    senderAddress: 'DSJdZogGLmREMZTyJGSzSs2RL9UJjeqKd7',
    recipientAddress: 'DDVFpYk4BHKvXQRshzxdaxJ4S13J2YPBfK',
  },
  {
    time: 1426287677000,
    txid: '59a6a9cd14fb864a048b87ef006d168c345943edc1bc54e462694ac42c90cd04',
    type: TransactionType.flag,
    nonce: 3,
    referenceNonce: null,
    content: 'a21f4c7f2aa418aea0a72e34aa753d5aa0bd77918053da3fe06ecb54145657f2',
    fee: 100000000,
    value: 0,
    senderAddress: 'DG7z89QMNB7xJr7Z44TwZPd8BUFSBoamW7',
    recipientAddress: null,
  },
]

export const standardTxs1: StandardTx[] = [
  {
    hex: "01000000011d6ae356eea2cf64089138f6b60e0066212b15b620aa9b54c4379ea6ba0d4593000000006b483045022100a0953993e7017828a535c84024fee8bd0e903056332399ff2fdc6e46f57f3e7f02200e53c4a1ed32ecf25b5985631d6e2d201fd6a406c9954294763dfb3c9874d59c0121036d080a3b68a8bc87e02e37b701b1abe4d30403e5de12c2fa82203807241f18d4feffffff024b8047a4874f00001976a914116ca09b0d2d550932fe7160bfae75cd8e2f633488acd6647fcd3c0300001976a914f794826d115a8c3e4ce956a184b97244ef6649ff88acec8e2900",
    txid: "d3690b08888f171e83922dc665ceda5a7cd467940797345cc7bd434f06da5cbe",
    inputs: [
      {
        txid: "93450dbaa69e37c4549baa20b6152b2166000eb6f638910864cfa2ee56e36a1d",
        index: 0,
      },
    ],
    outputs: [
      {
        value: 87443995328587,
        index: 0,
        address: "D6jEA5fbqgteN2KXbEnvW49VezZf9miDky",
      },
      {
        value: 3559680599254,
        index: 1,
        address: "DTiBMG2YEqeX5egCnqzQ6tdJS4T4s1NucZ",
      },
    ],
    time: 1557809241000,
  },
]
