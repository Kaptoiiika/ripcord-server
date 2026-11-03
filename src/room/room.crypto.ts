import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  scryptSync,
  timingSafeEqual,
} from 'crypto'

const SCRYPT_KEY_LENGTH = 32
const TOKEN_IV_LENGTH = 12
const TOKEN_KEY_SALT = 'ripcord-room-token'

let tokenKey: Buffer | undefined

const getTokenKey = () => {
  if (tokenKey) return tokenKey

  const secret = process.env.ROOM_TOKEN_SECRET

  if (secret) {
    tokenKey = scryptSync(secret, TOKEN_KEY_SALT, SCRYPT_KEY_LENGTH)
    return tokenKey
  }

  tokenKey = randomBytes(SCRYPT_KEY_LENGTH)
  console.warn(
    'ROOM_TOKEN_SECRET is not set. A random key was generated; room tokens will stop working after the server restarts.',
  )
  return tokenKey
}

export const hashPassword = (password: string) => {
  const salt = randomBytes(16)
  const hash = scryptSync(password, salt, SCRYPT_KEY_LENGTH)

  return `${salt.toString('base64url')}.${hash.toString('base64url')}`
}

export const verifyPassword = (password: string, passwordHash: string) => {
  const [saltPart, hashPart] = passwordHash.split('.')

  if (!saltPart || !hashPart) return false

  const salt = Buffer.from(saltPart, 'base64url')
  const expectedHash = Buffer.from(hashPart, 'base64url')
  const actualHash = scryptSync(password, salt, expectedHash.length)

  if (actualHash.length !== expectedHash.length) return false

  return timingSafeEqual(actualHash, expectedHash)
}

export const encryptRoomToken = (roomId: string, password: string) => {
  const iv = randomBytes(TOKEN_IV_LENGTH)
  const cipher = createCipheriv('aes-256-gcm', getTokenKey(), iv)
  const ciphertext = Buffer.concat([
    cipher.update(JSON.stringify({ roomId, password }), 'utf8'),
    cipher.final(),
  ])
  const authTag = cipher.getAuthTag()

  return [iv, authTag, ciphertext]
    .map((part) => part.toString('base64url'))
    .join('.')
}

export const decryptRoomToken = (token: string, roomId: string) => {
  const [ivPart, authTagPart, ciphertextPart] = token.split('.')

  if (!ivPart || !authTagPart || !ciphertextPart) return undefined

  try {
    const decipher = createDecipheriv(
      'aes-256-gcm',
      getTokenKey(),
      Buffer.from(ivPart, 'base64url'),
    )
    decipher.setAuthTag(Buffer.from(authTagPart, 'base64url'))
    const plaintext = Buffer.concat([
      decipher.update(Buffer.from(ciphertextPart, 'base64url')),
      decipher.final(),
    ]).toString('utf8')
    const payload = JSON.parse(plaintext) as {
      roomId?: unknown
      password?: unknown
    }

    if (payload.roomId !== roomId || typeof payload.password !== 'string') {
      return undefined
    }

    return payload.password
  } catch {
    return undefined
  }
}
