const pool = require('../db')

async function findByEmail(email, conn = pool) {
  const [rows] = await conn.query(
    'SELECT id, name, email, password_hash, role, balance, created_at, updated_at FROM users WHERE email = ? LIMIT 1',
    [email],
  )

  return rows[0] || null
}

async function findById(id, conn = pool) {
  const [rows] = await conn.query(
    'SELECT id, name, email, role, balance, created_at, updated_at FROM users WHERE id = ? LIMIT 1',
    [id],
  )

  return rows[0] || null
}

async function createUser({ name, email, passwordHash, role = 'USER' }, conn = pool) {
  const [result] = await conn.query(
    'INSERT INTO users (name, email, password_hash, role, balance) VALUES (?, ?, ?, ?, 0)',
    [name, email, passwordHash, role],
  )

  return findById(result.insertId, conn)
}

async function increaseBalance(userId, points, conn = pool) {
  await conn.query('UPDATE users SET balance = balance + ? WHERE id = ?', [points, userId])
  return findById(userId, conn)
}

module.exports = {
  findByEmail,
  findById,
  createUser,
  increaseBalance,
}
