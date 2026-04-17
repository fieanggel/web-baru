const { randomUUID } = require('crypto')
const pool = require('../db')

async function createDeposit({ userId, categoryId, estimatedWeight, reportPhotoUrl = null }, conn = pool) {
  const id = randomUUID()
  await conn.query(
    `INSERT INTO deposits
       (id, user_id, category_id, estimated_weight, report_photo_url, status)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [id, userId, categoryId, estimatedWeight, reportPhotoUrl, 'PENDING'],
  )

  return getById(id, conn)
}

async function getById(id, conn = pool) {
  const [rows] = await conn.query(
    `SELECT d.id, d.user_id, d.category_id, d.estimated_weight, d.actual_weight, d.points_earned,
            d.report_photo_url,
            d.status, d.created_at, d.updated_at,
            u.name AS user_name, u.email AS user_email,
            c.name AS category_name, c.price_per_kg
     FROM deposits d
     JOIN users u ON u.id = d.user_id
     JOIN categories c ON c.id = d.category_id
     WHERE d.id = ?
     LIMIT 1`,
    [id],
  )

  return rows[0] || null
}

async function getDashboardMetrics(conn = pool) {
  const [rows] = await conn.query(
    `SELECT
       (SELECT COUNT(*) FROM deposits WHERE status = 'PENDING') AS pending_count,
       (SELECT COALESCE(SUM(actual_weight), 0) FROM deposits
         WHERE DATE(created_at) = CURDATE() AND actual_weight IS NOT NULL) AS daily_actual_weight,
       (SELECT COALESCE(SUM(points_earned), 0) FROM deposits
         WHERE DATE(updated_at) = CURDATE() AND status = 'VERIFIED') AS daily_points_issued`,
  )

  return rows[0]
}

async function listMonitoringQueue(limit = 50, conn = pool) {
  const safeLimit = Math.max(1, Math.min(200, Number(limit) || 50))
  const [rows] = await conn.query(
    `SELECT d.id, d.user_id, d.category_id, d.estimated_weight, d.actual_weight, d.points_earned,
            d.report_photo_url,
            d.status, d.created_at,
            u.name AS user_name,
            c.name AS category_name
     FROM deposits d
     JOIN users u ON u.id = d.user_id
     JOIN categories c ON c.id = d.category_id
     ORDER BY d.created_at DESC
     LIMIT ?`,
    [safeLimit],
  )

  return rows
}

async function listByUser(userId, conn = pool) {
  const [rows] = await conn.query(
    `SELECT d.id, d.user_id, d.category_id, d.estimated_weight, d.actual_weight, d.points_earned,
            d.report_photo_url,
            d.status, d.created_at, d.updated_at,
            c.name AS category_name, c.price_per_kg
     FROM deposits d
     JOIN categories c ON c.id = d.category_id
     WHERE d.user_id = ?
     ORDER BY d.created_at DESC`,
    [userId],
  )

  return rows
}

async function approveDeposit({ id, actualWeight, pointsEarned }, conn = pool) {
  const [result] = await conn.query(
    `UPDATE deposits
     SET status = 'VERIFIED', actual_weight = ?, points_earned = ?
     WHERE id = ? AND status = 'PENDING'`,
    [actualWeight, pointsEarned, id],
  )

  return result.affectedRows > 0
}

async function rejectDeposit(id, conn = pool) {
  const [result] = await conn.query(
    `UPDATE deposits
     SET status = 'REJECTED', actual_weight = NULL, points_earned = 0
     WHERE id = ? AND status = 'PENDING'`,
    [id],
  )

  return result.affectedRows > 0
}

module.exports = {
  createDeposit,
  getById,
  getDashboardMetrics,
  listMonitoringQueue,
  listByUser,
  approveDeposit,
  rejectDeposit,
}
