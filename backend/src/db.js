const mysql = require('mysql2/promise')
require('dotenv').config()

const dbHost = process.env.DB_HOST || '127.0.0.1'
const dbPort = process.env.DB_PORT ? Number(process.env.DB_PORT) : 3306
const dbUser = process.env.DB_USER || 'root'
const dbPassword = process.env.DB_PASSWORD || ''
const dbName = process.env.DB_NAME || 'user_crud'
const connectTimeout = process.env.DB_CONNECT_TIMEOUT
  ? Number(process.env.DB_CONNECT_TIMEOUT)
  : 10000
const useSsl = process.env.DB_SSL === 'true'
const rejectUnauthorized = process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false'

const pool = mysql.createPool({
  host: dbHost,
  port: dbPort,
  user: dbUser,
  password: dbPassword,
  database: dbName,
  waitForConnections: true,
  connectionLimit: 10,
  connectTimeout,
  ssl: useSsl ? { rejectUnauthorized } : undefined,
})

module.exports = pool
