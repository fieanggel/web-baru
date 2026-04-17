const mysql = require('mysql2/promise')
const fs = require('fs').promises
const path = require('path')
const { hashPassword, normalizeEmail } = require('./utils/password')
require('dotenv').config()

function getDbName() {
  const dbName = String(process.env.DB_NAME || 'user_crud').trim()

  if (!/^[A-Za-z0-9_]+$/.test(dbName)) {
    throw new Error(
      `Invalid DB_NAME "${dbName}". Only letters, numbers, and underscore are allowed.`,
    )
  }

  return dbName
}

function stripDatabaseDirectives(sql) {
  return sql
    .replace(
      /^\s*CREATE\s+DATABASE\s+IF\s+NOT\s+EXISTS\s+`?[A-Za-z0-9_]+`?.*;\s*$/gim,
      '',
    )
    .replace(/^\s*USE\s+`?[A-Za-z0-9_]+`?\s*;\s*$/gim, '')
}

async function ensureDatabase(conn, dbName) {
  try {
    await conn.query(
      `CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci`,
    )
  } catch (err) {
    // Some managed DB users cannot CREATE DATABASE, but can still USE an existing one.
    if (err?.code !== 'ER_DBACCESS_DENIED_ERROR' && err?.code !== 'ER_ACCESS_DENIED_ERROR') {
      throw err
    }
    console.warn(`Skipping CREATE DATABASE for ${dbName}: ${err.message}`)
  }

  await conn.query(`USE \`${dbName}\``)
}

async function ensureColumn(conn, columnName, columnDefinition) {
  const [rows] = await conn.query('SHOW COLUMNS FROM users LIKE ?', [columnName])
  if (!rows.length) {
    await conn.query(`ALTER TABLE users ADD COLUMN ${columnDefinition}`)
  }
}

async function ensureColumnInTable(conn, tableName, columnName, columnDefinition) {
  const [rows] = await conn.query(`SHOW COLUMNS FROM \`${tableName}\` LIKE ?`, [columnName])
  if (!rows.length) {
    await conn.query(`ALTER TABLE \`${tableName}\` ADD COLUMN ${columnDefinition}`)
  }
}

async function ensureAdminSeed(conn) {
  const adminName = String(process.env.ADMIN_SEED_NAME || 'Administrator').trim() || 'Administrator'
  const adminEmail = normalizeEmail(process.env.ADMIN_SEED_EMAIL || 'admin@gmail.com')
  const adminPassword = String(process.env.ADMIN_SEED_PASSWORD || 'admin123')
  const forcePasswordReset = process.env.ADMIN_SEED_FORCE_PASSWORD_RESET === 'true'

  const passwordHash = hashPassword(adminPassword)

  const [rows] = await conn.query(
    'SELECT id, role, password_hash FROM users WHERE email = ? LIMIT 1',
    [adminEmail],
  )

  if (!rows.length) {
    await conn.query(
      'INSERT INTO users (name, email, password_hash, role, balance) VALUES (?, ?, ?, ?, 0)',
      [adminName, adminEmail, passwordHash, 'ADMIN'],
    )
    console.log(`Admin seed created: ${adminEmail}`)
  } else {
    const existing = rows[0]
    const updates = []
    const params = []

    if (existing.role !== 'ADMIN') {
      updates.push('role = ?')
      params.push('ADMIN')
    }

    if (!existing.password_hash || forcePasswordReset) {
      updates.push('password_hash = ?')
      params.push(passwordHash)
    }

    if (updates.length) {
      params.push(existing.id)
      await conn.query(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, params)
      console.log(`Admin seed updated: ${adminEmail}`)
    } else {
      console.log(`Admin seed already exists: ${adminEmail}`)
    }
  }

  if (!process.env.ADMIN_SEED_PASSWORD) {
    console.warn(
      'ADMIN_SEED_PASSWORD is not set. Default admin password is active; change it in environment immediately.',
    )
  }
}

async function migrate() {
  const sqlPath = path.join(__dirname, '..', 'db', 'init.sql')
  const sql = stripDatabaseDirectives(await fs.readFile(sqlPath, 'utf8'))
  const dbName = getDbName()

  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    multipleStatements: true,
  })

  try {
    console.log(`Running SQL migration on database "${dbName}" from ${sqlPath}`)

    await ensureDatabase(conn, dbName)
    if (sql.trim()) {
      await conn.query(sql)
    }

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
    await ensureColumnInTable(
      conn,
      'deposits',
      'report_photo_url',
      '`report_photo_url` TEXT DEFAULT NULL',
    )

    await ensureAdminSeed(conn)

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
