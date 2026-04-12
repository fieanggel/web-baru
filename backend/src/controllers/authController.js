const { hashPassword, normalizeEmail, verifyPassword } = require('../utils/password')
const { signAccessToken } = require('../utils/jwt')
const userModel = require('../models/userModel')

function toPublicUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    balance: Number(user.balance || 0),
    createdAt: user.created_at ?? null,
    updatedAt: user.updated_at ?? null,
  }
}

exports.register = async (req, res) => {
  const name = String(req.body?.name || '').trim()
  const email = normalizeEmail(req.body?.email)
  const password = String(req.body?.password || '')

  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Name, email, and password are required' })
  }

  try {
    const existing = await userModel.findByEmail(email)
    if (existing) {
      return res.status(409).json({ error: 'Email is already registered' })
    }

    const passwordHash = hashPassword(password)
    const createdUser = await userModel.createUser({
      name,
      email,
      passwordHash,
      role: 'USER',
    })

    const token = signAccessToken(createdUser)

    return res.status(201).json({
      message: 'Registration successful',
      token,
      user: toPublicUser(createdUser),
    })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Database error' })
  }
}

exports.login = async (req, res) => {
  const email = normalizeEmail(req.body?.email)
  const password = String(req.body?.password || '')

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' })
  }

  try {
    const user = await userModel.findByEmail(email)

    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' })
    }

    if (!user.password_hash) {
      return res.status(400).json({ error: 'Password login is not enabled for this account' })
    }

    const valid = verifyPassword(password, user.password_hash)
    if (!valid) {
      return res.status(401).json({ error: 'Invalid email or password' })
    }

    const token = signAccessToken(user)

    return res.json({
      message: 'Login successful',
      token,
      user: toPublicUser(user),
    })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Database error' })
  }
}