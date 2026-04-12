const { verifyAccessToken } = require('../utils/jwt')

function getTokenFromRequest(req) {
  const authHeader = req.headers.authorization || ''
  if (!authHeader.startsWith('Bearer ')) {
    return null
  }

  return authHeader.slice('Bearer '.length).trim() || null
}

function authRequired(req, res, next) {
  const token = getTokenFromRequest(req)
  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized: missing bearer token',
    })
  }

  try {
    const payload = verifyAccessToken(token)
    req.user = payload
    return next()
  } catch (err) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized: invalid or expired token',
    })
  }
}

module.exports = {
  authRequired,
}
