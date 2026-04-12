const crypto = require('crypto')

const ITERATIONS = 120000
const KEY_LENGTH = 64
const DIGEST = 'sha256'
const PREFIX = 'pbkdf2'

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase()
}

function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const derivedKey = crypto
    .pbkdf2Sync(String(password), salt, ITERATIONS, KEY_LENGTH, DIGEST)
    .toString('hex')

  return `${PREFIX}$${ITERATIONS}$${salt}$${derivedKey}`
}

function verifyPassword(password, storedHash) {
  const parts = String(storedHash || '').split('$')
  if (parts.length !== 4 || parts[0] !== PREFIX) {
    return false
  }

  const iterations = Number(parts[1])
  const salt = parts[2]
  const expected = parts[3]

  if (!iterations || !salt || !expected) {
    return false
  }

  const derivedKey = crypto
    .pbkdf2Sync(String(password), salt, iterations, KEY_LENGTH, DIGEST)
    .toString('hex')

  const expectedBuffer = Buffer.from(expected, 'hex')
  const derivedBuffer = Buffer.from(derivedKey, 'hex')

  if (expectedBuffer.length !== derivedBuffer.length) {
    return false
  }

  return crypto.timingSafeEqual(expectedBuffer, derivedBuffer)
}

module.exports = {
  hashPassword,
  normalizeEmail,
  verifyPassword,
}