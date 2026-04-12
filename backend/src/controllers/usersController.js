const pool = require('../db')
const { hashPassword, normalizeEmail } = require('../utils/password')

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

async function findUserByEmail(email) {
  const [rows] = await pool.query('SELECT id, name, email FROM users WHERE email = ? LIMIT 1', [email])
  return rows[0] ?? null
}

exports.getAll = async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT id, name, email, role, balance, created_at, updated_at FROM users ORDER BY id ASC',
    )
    res.json(rows.map(toPublicUser))
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Database error' })
  }
}

exports.getById = async (req, res) => {
  const id = Number(req.params.id)
  try {
    const [rows] = await pool.query(
      'SELECT id, name, email, role, balance, created_at, updated_at FROM users WHERE id = ?',
      [id],
    )
    if (!rows.length) return res.status(404).json({ error: 'User not found' })
    res.json(toPublicUser(rows[0]))
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Database error' })
  }
}

exports.create = async (req, res) => {
  const name = String(req.body?.name || '').trim()
  const email = normalizeEmail(req.body?.email)
  const password = String(req.body?.password || '')

  if (!name || !email) {
    return res.status(400).json({ error: 'Name and email are required' })
  }

  try {
    const existingUser = await findUserByEmail(email)
    if (existingUser) {
      return res.status(409).json({ error: 'Email is already in use' })
    }

    const passwordHash = password ? hashPassword(password) : null
    const [result] = await pool.query(
      'INSERT INTO users (name, email, password_hash, role, balance) VALUES (?, ?, ?, ?, ?)',
      [name, email, passwordHash, 'USER', 0],
    )

    res.status(201).json({
      id: result.insertId,
      name,
      email,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })
  } catch (err) {
    console.error('DB error:', err)
    res.status(500).json({ error: err?.message || 'Database error' })
  }
}

exports.update = async (req, res) => {
  const id = Number(req.params.id)
  const name = req.body?.name === undefined ? undefined : String(req.body.name).trim()
  const email = req.body?.email === undefined ? undefined : normalizeEmail(req.body.email)
  const password = req.body?.password === undefined ? undefined : String(req.body.password || '')

  try {
    const [rows] = await pool.query('SELECT * FROM users WHERE id = ?', [id])
    if (!rows.length) return res.status(404).json({ error: 'User not found' })

    const current = rows[0]
    const nextName = name && name.length ? name : current.name
    const nextEmail = email && email.length ? email : current.email

    if (nextEmail !== current.email) {
      const duplicate = await findUserByEmail(nextEmail)
      if (duplicate && duplicate.id !== id) {
        return res.status(409).json({ error: 'Email is already in use' })
      }
    }

    const nextPasswordHash = password === undefined ? current.password_hash : password ? hashPassword(password) : null

    await pool.query(
      'UPDATE users SET name = ?, email = ?, password_hash = ? WHERE id = ?',
      [nextName, nextEmail, nextPasswordHash, id],
    )

    res.json({
      id,
      name: nextName,
      email: nextEmail,
      role: current.role,
      balance: Number(current.balance || 0),
      createdAt: current.created_at ?? null,
      updatedAt: new Date().toISOString(),
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Database error' })
  }
}

exports.remove = async (req, res) => {
  const id = Number(req.params.id)
  try {
    const [rows] = await pool.query('SELECT * FROM users WHERE id = ?', [id])
    if (!rows.length) return res.status(404).json({ error: 'User not found' })
    const removed = rows[0]
    await pool.query('DELETE FROM users WHERE id = ?', [id])
    res.json(toPublicUser(removed))
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Database error' })
  }
}
