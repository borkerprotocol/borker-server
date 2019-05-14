export function randomAddressOrTxid(address: boolean) {
  let text = address ? 'D' : ''
  const base58 = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'
  const size = address ? 33 : 64

  for (var i = 0; i < size; i++) {
    text += base58.charAt(Math.floor(Math.random() * 58))
  }

  return text
}