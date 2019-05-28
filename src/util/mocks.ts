import { UtxoSeed } from '../db/entities/utxo'

export enum TransactionType {
  setName = 'set_name',
  setBio = 'set_bio',
  setAvatar = 'set_avatar',
  bork = 'bork',
  comment = 'comment',
  rebork = 'rebork',
  extension = 'extension',
  delete = 'delete',
  like = 'like',
  unlike = 'unlike',
  flag = 'flag',
  unflag = 'unflag',
  follow = 'follow',
  unfollow = 'unfollow',
  block = 'block',
  unblock = 'unblock',
}

export interface BorkerTx {
  time: number
  txid: string
  type: TransactionType
  nonce: number | null
  index: number | null
  content: string | null
  referenceId: string | null
  senderAddress: string
  recipientAddress: string | null
  mentions: string[]
}

export interface Spent {
  txid: string
  index: number
}

export const mockTxs1: BorkerTx[] = [
  {
    time: 1412177231000,
    txid: '39128e8edacce1ada4e1df9aa5fc91431302ef951df06a78e13f4fbc3759e752',
    type: TransactionType.setName,
    nonce: null,
    index: null,
    content: 'MattHill',
    referenceId: null,
    senderAddress: 'DSJdZogGLmREMZTyJGSzSs2RL9UJjeqKd7',
    recipientAddress: null,
    mentions: [],
  },
  {
    time: 1422182926000,
    txid: '8b5ab18a8593ba3f1abae61c07bf02169487c58b0e244922b6c4578eaf6e0d35',
    type: TransactionType.bork,
    nonce: 14,
    index: 0,
    content: 'I like to bork. I like to bork',
    referenceId: null,
    senderAddress: 'DSJdZogGLmREMZTyJGSzSs2RL9UJjeqKd7',
    recipientAddress: null,
    mentions: [],
  },
  {
    time: 1422184977000,
    txid: '774bef2197e6394112e1ee18246f1a0137ddb19a4d2d4464c1e25217977a0460',
    type: TransactionType.rebork,
    nonce: 10,
    index: 0,
    content: null,
    referenceId: '8b',
    senderAddress: 'D65dwxsVdaCFHUGqAVWKgdddsa9ADxXcGk',
    recipientAddress: 'DSJdZogGLmREMZTyJGSzSs2RL9UJjeqKd7',
    mentions: [],
  },
  {
    time: 1423181711000,
    txid: '43873bcc83d6d811df6bff1909a5cd3fc98eb84bbaded5a44443fc86f9ef0e3b',
    type: TransactionType.bork,
    nonce: 0,
    index: 0,
    content: 'Bork some more. Bork some more. #Tomorrow',
    referenceId: null,
    senderAddress: 'D65dwxsVdaCFHUGqAVWKgdddsa9ADxXcGk',
    recipientAddress: null,
    mentions: [],
  },
  // this extension will be orphaned and then cleaned up later
  {
    time: 1424967192200,
    txid: '89520b2306424bb8704ac63adbb03311f5d3fd4bd2deb72dbe40bfbfc219a5ba',
    type: TransactionType.extension,
    nonce: 156,
    index: 1,
    content: 'extension that was orphaned for a while',
    referenceId: null,
    senderAddress: 'DDVFpYk4BHKvXQRshzxdaxJ4S13J2YPBfK',
    recipientAddress: null,
    mentions: ['DSJdZogGLmREMZTyJGSzSs2RL9UJjeqKd7'],
  },
]

export const mockTxs2: BorkerTx[] = [
  {
    time: 1424167335000,
    txid: '069aa2f138cbdc6ebd379b1e6d1cb7f86c8770ad58be27006671d528a75ba0e3',
    type: TransactionType.bork,
    nonce: 222,
    index: 0,
    content: 'Borking like there aint no #tomorrow',
    referenceId: null,
    senderAddress: 'DSJdZogGLmREMZTyJGSzSs2RL9UJjeqKd7',
    recipientAddress: null,
    mentions: [],
  },
  {
    time: 1424169440000,
    txid: '41266e19b39dbba35128f3af72299b4636cb9250d81741b5db1987716043a7af',
    type: TransactionType.rebork,
    nonce: 25,
    index: 0,
    content: 'This is a rebork with a comment...',
    referenceId: '069aa2f138cbdc6ebd379b1e6d1cb7f86c8770ad58be27006671d528a75ba0e3',
    senderAddress: 'D65dwxsVdaCFHUGqAVWKgdddsa9ADxXcGk',
    recipientAddress: 'DSJdZogGLmREMZTyJGSzSs2RL9UJjeqKd7',
    mentions: [],
  },
  {
    time: 1424561124000,
    txid: '99f14aa1ac661f932113cbb92cfa7ee1cfc649cbc416f7c6aa43b13ce301d3a4',
    type: TransactionType.comment,
    nonce: 100,
    index: 0,
    content: 'And some more!',
    referenceId: '43',
    senderAddress: 'DSJdZogGLmREMZTyJGSzSs2RL9UJjeqKd7',
    recipientAddress: 'D65dwxsVdaCFHUGqAVWKgdddsa9ADxXcGk',
    mentions: [],
  },
  {
    time: 1424967992000,
    txid: '164af924f859c9936f3bda737a986a1a85b3708c9b2fd150b36b964b11c858a6',
    type: TransactionType.bork,
    nonce: 211,
    index: 0,
    content: 'This is a long bork that will take up two whole transactions. I will write',
    referenceId: null,
    senderAddress: 'D65dwxsVdaCFHUGqAVWKgdddsa9ADxXcGk',
    recipientAddress: null,
    mentions: [],
  },
  {
    time: 1424967992200,
    txid: 'e3b3a8bf7e3796d908b731c0d16baba0f1e161b97d917e00cde81ff0f1452fd1',
    type: TransactionType.extension,
    nonce: 211,
    index: 1,
    content: 'just a little more. See, I told you. Bork on.',
    referenceId: null,
    senderAddress: 'D65dwxsVdaCFHUGqAVWKgdddsa9ADxXcGk',
    recipientAddress: null,
    mentions: ['DSJdZogGLmREMZTyJGSzSs2RL9UJjeqKd7'],
  },
  {
    time: 1425188584000,
    txid: '3ffa42642f6dfd718562b8a6d04c403b20b59fe873eadd1960e402769cee1318',
    type: TransactionType.follow,
    nonce: null,
    index: null,
    content: 'DSJdZogGLmREMZTyJGSzSs2RL9UJjeqKd7',
    referenceId: null,
    senderAddress: 'D65dwxsVdaCFHUGqAVWKgdddsa9ADxXcGk',
    recipientAddress: null,
    mentions: [],
  },
]

export const mockTxs3: BorkerTx[] = [
  {
    time: 1425287522000,
    txid: '4cb6f18366e4a32ff69e681d192aec89a4d8721af544725fe6a02ecde4311605',
    type: TransactionType.setName,
    nonce: null,
    index: null,
    content: 'aiden_mcclelland',
    referenceId: null,
    senderAddress: 'D65dwxsVdaCFHUGqAVWKgdddsa9ADxXcGk',
    recipientAddress: null,
    mentions: [],
  },
  {
    time: 1424967392200,
    txid: 'a21f4c7f2aa418aea0a72e34aa753d5aa0bd77918053da3fe06ecb54145657f2',
    type: TransactionType.comment,
    nonce: 156,
    index: 0,
    content: 'Wow that was so borking cool. Now I will create an',
    referenceId: 'e3b3',
    senderAddress: 'DDVFpYk4BHKvXQRshzxdaxJ4S13J2YPBfK',
    recipientAddress: 'D65dwxsVdaCFHUGqAVWKgdddsa9ADxXcGk',
    mentions: [],
  },
  {
    time: 1425399510000,
    txid: '8a3e0fe9ebc5e2fec31b12e7880f0dc184b56fd2d0541fcc3e6c0a1530826913',
    type: TransactionType.setBio,
    nonce: null,
    index: null,
    content: 'I am a Bork Master',
    referenceId: null,
    senderAddress: 'D65dwxsVdaCFHUGqAVWKgdddsa9ADxXcGk',
    recipientAddress: null,
    mentions: [],
  },
  {
    time: 1426287533000,
    txid: 'c7c4e2977cc67cc16ee8fec757a61219deddcc8edfb6e20ab818af29f4be9373',
    type: TransactionType.follow,
    nonce: null,
    index: null,
    content: 'D65dwxsVdaCFHUGqAVWKgdddsa9ADxXcGk',
    referenceId: null,
    senderAddress: 'DDVFpYk4BHKvXQRshzxdaxJ4S13J2YPBfK',
    recipientAddress: null,
    mentions: [],
  },
]

export const mockTxs4: BorkerTx[] = [
  {
    time: 1425287522000,
    txid: '0b692b4e683a3ea47f0b3b6a6f30e8cca6efcc78f1c2eb6e35430af9b9415eb5',
    type: TransactionType.setBio,
    nonce: null,
    index: null,
    content: 'I am the unknown Borker who shall someday be known',
    referenceId: null,
    senderAddress: 'DG7z89QMNB7xJr7Z44TwZPd8BUFSBoamW7',
    recipientAddress: null,
    mentions: [],
  },
  {
    time: 1426287533000,
    txid: '3a7f46861703322b75fed4594cd94eb9c04c5a6edb0c1e4ecd1eb91ba2fc4304',
    type: TransactionType.block,
    nonce: null,
    index: null,
    content: 'DG7z89QMNB7xJr7Z44TwZPd8BUFSBoamW7',
    referenceId: null,
    senderAddress: 'DDVFpYk4BHKvXQRshzxdaxJ4S13J2YPBfK',
    recipientAddress: null,
    mentions: [],
  },
  {
    time: 1425399510000,
    txid: '20d721480d0450a1b9666618ee618bfbacde74a4bade40908063c6c344bc7214',
    type: TransactionType.unfollow,
    nonce: null,
    index: null,
    content: 'D65dwxsVdaCFHUGqAVWKgdddsa9ADxXcGk',
    referenceId: null,
    senderAddress: 'DDVFpYk4BHKvXQRshzxdaxJ4S13J2YPBfK',
    recipientAddress: null,
    mentions: [],
  },
  {
    time: 1426287533000,
    txid: '2d9509c33a8e93152a42f2aa048404b304ba858dc0ad8f305ba16223781d46fc',
    type: TransactionType.like,
    nonce: null,
    index: null,
    content: null,
    referenceId: '164af9',
    senderAddress: 'DG7z89QMNB7xJr7Z44TwZPd8BUFSBoamW7',
    recipientAddress: 'D65dwxsVdaCFHUGqAVWKgdddsa9ADxXcGk',
    mentions: [],
  },
  {
    time: 1426287533000,
    txid: 'f93162e896c44fae41c75b66f2c1aa2eeb6e7de54a21b89075f99a90f582434e',
    type: TransactionType.like,
    nonce: null,
    index: null,
    content: null,
    referenceId: '89',
    senderAddress: 'DSJdZogGLmREMZTyJGSzSs2RL9UJjeqKd7',
    recipientAddress: 'DDVFpYk4BHKvXQRshzxdaxJ4S13J2YPBfK',
    mentions: [],
  },
  // this comment will be left orphaned
  {
    time: 1426287533000,
    txid: '2312757481a28100402f71e788d2922f9aae766af10dda0b28dfd7dd858e15a1',
    type: TransactionType.comment,
    nonce: 14,
    index: 0,
    content: 'a poor orphaned comment',
    referenceId: '9c7c44c005d53fc6f790dd0a4453c8b2e79703dd23ed33f6a996d6a15dcf0428',
    senderAddress: 'DG7z89QMNB7xJr7Z44TwZPd8BUFSBoamW7',
    recipientAddress: 'DSJdZogGLmREMZTyJGSzSs2RL9UJjeqKd7',
    mentions: [],
  },
  {
    time: 1426287677000,
    txid: '59a6a9cd14fb864a048b87ef006d168c345943edc1bc54e462694ac42c90cd04',
    type: TransactionType.flag,
    nonce: null,
    index: null,
    content: 'a21f4c7f2aa418aea0a72e34aa753d5aa0bd77918053da3fe06ecb54145657f2',
    referenceId: null,
    senderAddress: 'DSJdZogGLmREMZTyJGSzSs2RL9UJjeqKd7',
    recipientAddress: null,
    mentions: [],
  },
  // this flag will not save because sender is blocked
  {
    time: 1426287677000,
    txid: '59a6a9cd14fb864a048b87ef006d168c345943edc1bc54e462694ac42c90cd04',
    type: TransactionType.flag,
    nonce: null,
    index: null,
    content: 'a21f4c7f2aa418aea0a72e34aa753d5aa0bd77918053da3fe06ecb54145657f2',
    referenceId: null,
    senderAddress: 'DG7z89QMNB7xJr7Z44TwZPd8BUFSBoamW7',
    recipientAddress: null,
    mentions: [],
  },
]

export const mockCreated1: UtxoSeed[] = [
  {
    txid: '89da78a5802eb72ba3ae4e12654b10b0223221f7f76ac915f5636394a8c463e7',
    address: 'D65dwxsVdaCFHUGqAVWKgdddsa9ADxXcGk',
    value: 8000000000,
    index: 0,
    raw: '010000000152e75937bc4f3fe1786af01d95ef02134391fca59adfe1a4ade1ccda8e8e123901000000da004830450221009189dc1f14024716f8218a61218f785659173ad6e608cb58bd5f93bc9cd63fdd022037df4fb6c29050a6b2547ccd3d4b5d03ecd702ded94d3e9c6fa21efa4b9acd0a014730440220192d73ee117b41b60277ba564343f5a105b11e3d1b9c4378d786a31af1fbad6102204c59f0d0a1dac5feffd649df1cc36da1fbf78285ff201f309016bd261f7a53210147522102012158ac45c66ae1296a5ea7c072a02a105f8faa87cf92871fb58bec83c8d18d2103edeba31cd5cba392bcd757ce6e2ffc0355e39c99b619a4e82cf4b279e3234f1252aeffffffff020003f743080000001976a914370d6922723753a7a97c960c180008e06f6e2f3988ac22a2523cc202000017a914bca5ccb8dca9a7731d20733727a0371b4084c6488700000000',
  },
  {
    txid: 'e50932147f252efe16ad377a0d07f4a58758b1cb27a896f4cdc7e19fdbe7ca2e',
    address: 'DDVFpYk4BHKvXQRshzxdaxJ4S13J2YPBfK',
    value: 905000000,
    index: 0,
    raw: '010000000152e75937bc4f3fe1786af01d95ef02134391fca59adfe1a4ade1ccda8e8e123901000000da004830450221009189dc1f14024716f8218a61218f785659173ad6e608cb58bd5f93bc9cd63fdd022037df4fb6c29050a6b2547ccd3d4b5d03ecd702ded94d3e9c6fa21efa4b9acd0a014730440220192d73ee117b41b60277ba564343f5a105b11e3d1b9c4378d786a31af1fbad6102204c59f0d0a1dac5feffd649df1cc36da1fbf78285ff201f309016bd261f7a53210147522102012158ac45c66ae1296a5ea7c072a02a105f8faa87cf92871fb58bec83c8d18d2103edeba31cd5cba392bcd757ce6e2ffc0355e39c99b619a4e82cf4b279e3234f1252aeffffffff020003f743080000001976a914370d6922723753a7a97c960c180008e06f6e2f3988ac22a2523cc202000017a914bca5ccb8dca9a7731d20733727a0371b4084c6488700000000',
  },
  {
    txid: '774bef2197e6394112e1ee18246f1a0137ddb19a4d2d4464c1e25217977a0460',
    address: 'DSJdZogGLmREMZTyJGSzSs2RL9UJjeqKd7',
    value: 2000000000,
    index: 0,
    raw: '010000000152e75937bc4f3fe1786af01d95ef02134391fca59adfe1a4ade1ccda8e8e123901000000da004830450221009189dc1f14024716f8218a61218f785659173ad6e608cb58bd5f93bc9cd63fdd022037df4fb6c29050a6b2547ccd3d4b5d03ecd702ded94d3e9c6fa21efa4b9acd0a014730440220192d73ee117b41b60277ba564343f5a105b11e3d1b9c4378d786a31af1fbad6102204c59f0d0a1dac5feffd649df1cc36da1fbf78285ff201f309016bd261f7a53210147522102012158ac45c66ae1296a5ea7c072a02a105f8faa87cf92871fb58bec83c8d18d2103edeba31cd5cba392bcd757ce6e2ffc0355e39c99b619a4e82cf4b279e3234f1252aeffffffff020003f743080000001976a914370d6922723753a7a97c960c180008e06f6e2f3988ac22a2523cc202000017a914bca5ccb8dca9a7731d20733727a0371b4084c6488700000000',
  },
  // change
  {
    txid: '774bef2197e6394112e1ee18246f1a0137ddb19a4d2d4464c1e25217977a0460',
    address: 'D65dwxsVdaCFHUGqAVWKgdddsa9ADxXcGk',
    value: 5900000000,
    index: 1,
    raw: '010000000152e75937bc4f3fe1786af01d95ef02134391fca59adfe1a4ade1ccda8e8e123901000000da004830450221009189dc1f14024716f8218a61218f785659173ad6e608cb58bd5f93bc9cd63fdd022037df4fb6c29050a6b2547ccd3d4b5d03ecd702ded94d3e9c6fa21efa4b9acd0a014730440220192d73ee117b41b60277ba564343f5a105b11e3d1b9c4378d786a31af1fbad6102204c59f0d0a1dac5feffd649df1cc36da1fbf78285ff201f309016bd261f7a53210147522102012158ac45c66ae1296a5ea7c072a02a105f8faa87cf92871fb58bec83c8d18d2103edeba31cd5cba392bcd757ce6e2ffc0355e39c99b619a4e82cf4b279e3234f1252aeffffffff020003f743080000001976a914370d6922723753a7a97c960c180008e06f6e2f3988ac22a2523cc202000017a914bca5ccb8dca9a7731d20733727a0371b4084c6488700000000',
  },
]

export const mockCreated2: UtxoSeed[] = [
  {
    txid: '41266e19b39dbba35128f3af72299b4636cb9250d81741b5db1987716043a7af',
    address: 'DSJdZogGLmREMZTyJGSzSs2RL9UJjeqKd7',
    value: 1000000000,
    index: 0,
    raw: '010000000262df9a74ca67d26b58806c663f8ec0ada897012878c8b0a3a35ffa9ed3884627010000006b483045022100a7a0612277416d4eedd572c57ebcf2a527ba35055ef0d272d325f35ee4a487cd02207ac4efc8f46458f9c8c1987d916a847c14c4aadee5051a887d2b7e686b01aac6012103f6bc078d542f937fd496dc9cd1aafe9d321192265c21f3722a756d34de4219b6feffffffde4011114099874f48d19242caf3e9a3235040654f25c57ee30fdedba5643a82000000006a473044022061a9710de749e655582acccd9f902c76847b0a5041d5706d77383c9edaca260f0220694df77369886c692cff0eed604484cd3481f215430366f0251c605132800d51012103700368eb7c4865c7b1190da66e0008c1de799d43c87de95639924129cfcfd73dfeffffff0200c2eb0b000000001976a914be07a7b9e5721edd4b16ecfc13ef5990d1ed2dff88ac80841e00000000001976a9144f8052cb3b02c19f4d6bcbe9526cbc94e180175888accd982600',
  },
    // change
  {
    txid: '41266e19b39dbba35128f3af72299b4636cb9250d81741b5db1987716043a7af',
    address: 'DSJdZogGLmREMZTyJGSzSs2RL9UJjeqKd7',
    value: 4800000000,
    index: 1,
    raw: '010000000262df9a74ca67d26b58806c663f8ec0ada897012878c8b0a3a35ffa9ed3884627010000006b483045022100a7a0612277416d4eedd572c57ebcf2a527ba35055ef0d272d325f35ee4a487cd02207ac4efc8f46458f9c8c1987d916a847c14c4aadee5051a887d2b7e686b01aac6012103f6bc078d542f937fd496dc9cd1aafe9d321192265c21f3722a756d34de4219b6feffffffde4011114099874f48d19242caf3e9a3235040654f25c57ee30fdedba5643a82000000006a473044022061a9710de749e655582acccd9f902c76847b0a5041d5706d77383c9edaca260f0220694df77369886c692cff0eed604484cd3481f215430366f0251c605132800d51012103700368eb7c4865c7b1190da66e0008c1de799d43c87de95639924129cfcfd73dfeffffff0200c2eb0b000000001976a914be07a7b9e5721edd4b16ecfc13ef5990d1ed2dff88ac80841e00000000001976a9144f8052cb3b02c19f4d6bcbe9526cbc94e180175888accd982600',
  },
  {
    txid: '99f14aa1ac661f932113cbb92cfa7ee1cfc649cbc416f7c6aa43b13ce301d3a4',
    address: 'D65dwxsVdaCFHUGqAVWKgdddsa9ADxXcGk',
    value: 10000000000,
    index: 0,
    raw: '010000000262df9a74ca67d26b58806c663f8ec0ada897012878c8b0a3a35ffa9ed3884627010000006b483045022100a7a0612277416d4eedd572c57ebcf2a527ba35055ef0d272d325f35ee4a487cd02207ac4efc8f46458f9c8c1987d916a847c14c4aadee5051a887d2b7e686b01aac6012103f6bc078d542f937fd496dc9cd1aafe9d321192265c21f3722a756d34de4219b6feffffffde4011114099874f48d19242caf3e9a3235040654f25c57ee30fdedba5643a82000000006a473044022061a9710de749e655582acccd9f902c76847b0a5041d5706d77383c9edaca260f0220694df77369886c692cff0eed604484cd3481f215430366f0251c605132800d51012103700368eb7c4865c7b1190da66e0008c1de799d43c87de95639924129cfcfd73dfeffffff0200c2eb0b000000001976a914be07a7b9e5721edd4b16ecfc13ef5990d1ed2dff88ac80841e00000000001976a9144f8052cb3b02c19f4d6bcbe9526cbc94e180175888accd982600',
  },
]

export const mockCreated3: UtxoSeed[] = [
  {
    txid: 'a21f4c7f2aa418aea0a72e34aa753d5aa0bd77918053da3fe06ecb54145657f2',
    address: 'D65dwxsVdaCFHUGqAVWKgdddsa9ADxXcGk',
    value: 905000000,
    index: 0,
    raw: '0100000001ec26dbed51dceecbaa53ddcdc18c542307ae0fc2ae9110a8c0799f08df44826f020000006b483045022100a4e8e1ae7dcc18a99a7e778321acf93e9da390d6739ffbca7c16eb118e3c3b69022049feafce324beef28d2103bad3c1d35ffca156f092869156dcff51b964108ee1012103e7502b8906ecb0c6ad2470e3fdb85001127dd3f3062fc4e8a651229c3c49bc8fffffffff0200ac23fc060000001976a914ef4bb3249c38bad1bdd6aabae59400486d18f51c88ac1c929548c62f00001976a9148e134c775a0301645b4e1f4c3d419e4d3dca155588ac00000000',
  },
]

export const mockCreated4: UtxoSeed[] = [
  {
    txid: '2d9509c33a8e93152a42f2aa048404b304ba858dc0ad8f305ba16223781d46fc',
    address: 'D65dwxsVdaCFHUGqAVWKgdddsa9ADxXcGk',
    value: 2500000000,
    index: 0,
    raw: '0100000001ec26dbed51dceecbaa53ddcdc18c542307ae0fc2ae9110a8c0799f08df44826f020000006b483045022100a4e8e1ae7dcc18a99a7e778321acf93e9da390d6739ffbca7c16eb118e3c3b69022049feafce324beef28d2103bad3c1d35ffca156f092869156dcff51b964108ee1012103e7502b8906ecb0c6ad2470e3fdb85001127dd3f3062fc4e8a651229c3c49bc8fffffffff0200ac23fc060000001976a914ef4bb3249c38bad1bdd6aabae59400486d18f51c88ac1c929548c62f00001976a9148e134c775a0301645b4e1f4c3d419e4d3dca155588ac00000000',
  },
  {
    txid: 'f93162e896c44fae41c75b66f2c1aa2eeb6e7de54a21b89075f99a90f582434e',
    address: 'DDVFpYk4BHKvXQRshzxdaxJ4S13J2YPBfK',
    value: 4400000000,
    index: 0,
    raw: '0100000001ec26dbed51dceecbaa53ddcdc18c542307ae0fc2ae9110a8c0799f08df44826f020000006b483045022100a4e8e1ae7dcc18a99a7e778321acf93e9da390d6739ffbca7c16eb118e3c3b69022049feafce324beef28d2103bad3c1d35ffca156f092869156dcff51b964108ee1012103e7502b8906ecb0c6ad2470e3fdb85001127dd3f3062fc4e8a651229c3c49bc8fffffffff0200ac23fc060000001976a914ef4bb3249c38bad1bdd6aabae59400486d18f51c88ac1c929548c62f00001976a9148e134c775a0301645b4e1f4c3d419e4d3dca155588ac00000000',
  },
]

export const mockSpent1: Spent[] = []

export const mockSpent2: Spent[] = [
  {
    txid: '89da78a5802eb72ba3ae4e12654b10b0223221f7f76ac915f5636394a8c463e7',
    index: 0,
  },
]

export const mockSpent3: Spent[] = [
  {
    txid: '774bef2197e6394112e1ee18246f1a0137ddb19a4d2d4464c1e25217977a0460',
    index: 1,
  },
  {
    txid: '41266e19b39dbba35128f3af72299b4636cb9250d81741b5db1987716043a7af',
    index: 0,
  },
  {
    txid: 'e50932147f252efe16ad377a0d07f4a58758b1cb27a896f4cdc7e19fdbe7ca2e',
    index: 0,
  },
]

export const mockSpent4: Spent[] = [
  {
    txid: '',
    index: 0,
  },
]
