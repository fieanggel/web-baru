const mysql = require('mysql2/promise')
const fs = require('fs').promises
const path = require('path')
require('dotenv').config()

async function ensureColumn(conn, columnName, columnDefinition) {
  const [rows] = await conn.query('SHOW COLUMNS FROM users LIKE ?', [columnName])
  if (!rows.length) {
    await conn.query(`ALTER TABLE users ADD COLUMN ${columnDefinition}`)
  }
}

async function ensureColumnInTable(conn, tableName, columnName, columnDefinition) {
  const [rows] = await conn.query(`SHOW COLUMNS FROM ${tableName} LIKE ?`, [columnName])
  if (!rows.length) {
    await conn.query(`ALTER TABLE ${tableName} ADD COLUMN ${columnDefinition}`)
  }
}

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

    await ensureColumn(conn, 'password_hash', '`password_hash` VARCHAR(255) DEFAULT NULL')
    await ensureColumn(
      conn,
      'created_at',
      '`created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP',
    )
    await ensureColumn(
      conn,
      'updated_at',
      '`updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP',
    )
    await ensureColumn(
      conn,
      'role',
      "`role` ENUM('USER','ADMIN') NOT NULL DEFAULT 'USER'",
    )
    await ensureColumn(conn, 'balance', '`balance` INT NOT NULL DEFAULT 0')

    await ensureColumnInTable(
      conn,
      'categories',
      'updated_at',
      '`updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP',
    )
    await ensureColumnInTable(
      conn,
      'deposits',
      'updated_at',
      '`updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP',
    )

    console.log('Migration applied successfully.')
  } finally {
    await conn.end()
  }
}

if (require.main === module) {
  migrate().catch(err => {
    console.error('Migration failed:', err.message || err)
    process.exit(1)
  })
}

module.exports = migrate
