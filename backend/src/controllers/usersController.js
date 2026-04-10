const pool = require('../db')

exports.getAll = async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT id, name, email FROM users ORDER BY id ASC')
    res.json(rows)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Database error' })
  }
}

exports.getById = async (req, res) => {
  const id = Number(req.params.id)
  try {
    const [rows] = await pool.query('SELECT id, name, email FROM users WHERE id = ?', [id])
    if (!rows.length) return res.status(404).json({ error: 'User not found' })
    res.json(rows[0])
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Database error' })
  }
}

exports.create = async (req, res) => {
  const { name, email } = req.body
  console.log('POST /api/users - body:', req.body)
  try {
    const [result] = await pool.query('INSERT INTO users (name, email) VALUES (?, ?)', [name || '', email || ''])
    console.log('DB insert result:', result)
    const id = result.insertId
    res.status(201).json({ id, name: name || '', email: email || '' })
  } catch (err) {
    console.error('DB error:', err)
    res.status(500).json({ error: err?.message || 'Database error' })
  }
}

exports.update = async (req, res) => {
  const id = Number(req.params.id)
  const { name, email } = req.body
  try {
    const [rows] = await pool.query('SELECT * FROM users WHERE id = ?', [id])
    if (!rows.length) return res.status(404).json({ error: 'User not found' })
    const current = rows[0]
    const newName = name ?? current.name
    const newEmail = email ?? current.email
    await pool.query('UPDATE users SET name = ?, email = ? WHERE id = ?', [newName, newEmail, id])
    res.json({ id, name: newName, email: newEmail })
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
    res.json(removed)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Database error' })
  }
}
