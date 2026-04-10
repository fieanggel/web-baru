const mysql = require('mysql2/promise')
const fs = require('fs').promises
const path = require('path')
require('dotenv').config()

async function migrate() {
  const sqlPath = path.join(__dirname, '..', 'db', 'init.sql')
  const sql = await fs.readFile(sqlPath, 'utf8')

  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    multipleStatements: true,
  })

  try {
    console.log('Running SQL migration from', sqlPath)
    await conn.query(sql)
    console.log('Migration applied successfully.')
  } finally {
    await conn.end()
  }
}

migrate().catch(err => {
  console.error('Migration failed:', err.message || err)
  process.exit(1)
})
