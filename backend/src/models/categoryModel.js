const pool = require('../db')

async function listAll(conn = pool) {
  const [rows] = await conn.query(
    'SELECT id, name, price_per_kg, created_at, updated_at FROM categories ORDER BY id ASC',
  )
  return rows
}

async function getById(id, conn = pool) {
  const [rows] = await conn.query(
    'SELECT id, name, price_per_kg, created_at, updated_at FROM categories WHERE id = ? LIMIT 1',
    [id],
  )
  return rows[0] || null
}

async function updatePrice(id, pricePerKg, conn = pool) {
  const [result] = await conn.query('UPDATE categories SET price_per_kg = ? WHERE id = ?', [
    pricePerKg,
    id,
  ])

  if (!result.affectedRows) {
    return null
  }

  return getById(id, conn)
}

module.exports = {
  listAll,
  getById,
  updatePrice,
}
