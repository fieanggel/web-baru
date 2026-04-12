const jwt = require('jsonwebtoken')

const DEFAULT_SECRET = 'dev-secret-change-me'

function getJwtSecret() {
  return process.env.JWT_SECRET || DEFAULT_SECRET
}

function signAccessToken(user) {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role || 'USER',
    },
    getJwtSecret(),
    {
      expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    },
  )
}

function verifyAccessToken(token) {
  return jwt.verify(token, getJwtSecret())
}

module.exports = {
  signAccessToken,
  verifyAccessToken,
}
