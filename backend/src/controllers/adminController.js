const pool = require('../db')
const categoryModel = require('../models/categoryModel')
const depositModel = require('../models/depositModel')
const userModel = require('../models/userModel')

function formatDashboardDate(value) {
  const date = new Date(value)
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).format(date)
}

exports.getDashboardOverview = async (_req, res) => {
  try {
    const metrics = await depositModel.getDashboardMetrics()
    const dailyActualWeightKg = Number(metrics.daily_actual_weight || 0)

    return res.json({
      success: true,
      data: {
        pendingDeposits: Number(metrics.pending_count || 0),
        dailyActualWeightKg,
        dailyTonnage: Number((dailyActualWeightKg / 1000).toFixed(2)),
        pointsIssuedToday: Number(metrics.daily_points_issued || 0),
      },
    })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ success: false, error: 'Database error' })
  }
}

exports.getMonitoringQueue = async (req, res) => {
  const limit = Number(req.query?.limit || 50)

  try {
    const rows = await depositModel.listMonitoringQueue(limit)
    return res.json({
      success: true,
      data: rows.map(row => ({
        id: row.id,
        userName: row.user_name,
        wasteType: row.category_name,
        weight:
          row.actual_weight === null
            ? Number(row.estimated_weight || 0)
            : Number(row.actual_weight),
        estimatedWeight: Number(row.estimated_weight || 0),
        actualWeight: row.actual_weight === null ? null : Number(row.actual_weight),
        reportPhotoUrl: row.report_photo_url || null,
        pointsEarned: Number(row.points_earned || 0),
        date: formatDashboardDate(row.created_at),
        status: row.status,
      })),
    })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ success: false, error: 'Database error' })
  }
}

exports.approveDeposit = async (req, res) => {
  const depositId = String(req.params.id || '').trim()
  const actualWeight = Number(req.body?.actualWeight ?? req.body?.actual_weight)

  if (!depositId) {
    return res.status(400).json({ success: false, error: 'Deposit id is required' })
  }

  if (!Number.isFinite(actualWeight) || actualWeight <= 0) {
    return res
      .status(400)
      .json({ success: false, error: 'actualWeight must be a positive number' })
  }

  const conn = await pool.getConnection()
  try {
    await conn.beginTransaction()

    const deposit = await depositModel.getById(depositId, conn)
    if (!deposit) {
      await conn.rollback()
      return res.status(404).json({ success: false, error: 'Deposit not found' })
    }

    if (deposit.status !== 'PENDING') {
      await conn.rollback()
      return res.status(400).json({
        success: false,
        error: 'Deposit cannot be approved because status is not PENDING',
      })
    }

    const category = await categoryModel.getById(deposit.category_id, conn)
    if (!category) {
      await conn.rollback()
      return res.status(400).json({ success: false, error: 'Category not found for deposit' })
    }

    const pointsEarned = Math.round(actualWeight * Number(category.price_per_kg))

    const approved = await depositModel.approveDeposit(
      {
        id: depositId,
        actualWeight,
        pointsEarned,
      },
      conn,
    )

    if (!approved) {
      await conn.rollback()
      return res.status(400).json({
        success: false,
        error: 'Deposit approval failed. It may have been processed already.',
      })
    }

    const updatedUser = await userModel.increaseBalance(deposit.user_id, pointsEarned, conn)
    const updatedDeposit = await depositModel.getById(depositId, conn)

    await conn.commit()

    return res.json({
      success: true,
      data: {
        id: updatedDeposit.id,
        status: updatedDeposit.status,
        actualWeight: Number(updatedDeposit.actual_weight),
        pointsEarned: Number(updatedDeposit.points_earned),
        userId: updatedDeposit.user_id,
        userBalance: Number(updatedUser.balance),
      },
    })
  } catch (err) {
    await conn.rollback()
    console.error(err)
    return res.status(500).json({ success: false, error: 'Database error' })
  } finally {
    conn.release()
  }
}

exports.rejectDeposit = async (req, res) => {
  const depositId = String(req.params.id || '').trim()
  if (!depositId) {
    return res.status(400).json({ success: false, error: 'Deposit id is required' })
  }

  const conn = await pool.getConnection()
  try {
    await conn.beginTransaction()

    const deposit = await depositModel.getById(depositId, conn)
    if (!deposit) {
      await conn.rollback()
      return res.status(404).json({ success: false, error: 'Deposit not found' })
    }

    if (deposit.status !== 'PENDING') {
      await conn.rollback()
      return res.status(400).json({
        success: false,
        error: 'Deposit cannot be rejected because status is not PENDING',
      })
    }

    const rejected = await depositModel.rejectDeposit(depositId, conn)
    if (!rejected) {
      await conn.rollback()
      return res.status(400).json({
        success: false,
        error: 'Deposit rejection failed. It may have been processed already.',
      })
    }

    await conn.commit()

    return res.json({
      success: true,
      data: {
        id: deposit.id,
        status: 'REJECTED',
      },
    })
  } catch (err) {
    await conn.rollback()
    console.error(err)
    return res.status(500).json({ success: false, error: 'Database error' })
  } finally {
    conn.release()
  }
}

exports.getAdminCategories = async (_req, res) => {
  try {
    const categories = await categoryModel.listAll()
    return res.json({
      success: true,
      data: categories.map(category => ({
        id: category.id,
        name: category.name,
        pricePerKg: Number(category.price_per_kg),
        updatedAt: category.updated_at,
      })),
    })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ success: false, error: 'Database error' })
  }
}

exports.updateCategoryPrice = async (req, res) => {
  const categoryId = Number(req.params.id)
  const pricePerKg = Number(req.body?.pricePerKg ?? req.body?.price_per_kg)

  if (!Number.isInteger(categoryId) || categoryId <= 0) {
    return res.status(400).json({ success: false, error: 'Valid category id is required' })
  }

  if (!Number.isFinite(pricePerKg) || pricePerKg < 0) {
    return res.status(400).json({
      success: false,
      error: 'pricePerKg must be a non-negative number',
    })
  }

  try {
    const updated = await categoryModel.updatePrice(categoryId, Math.round(pricePerKg))
    if (!updated) {
      return res.status(404).json({ success: false, error: 'Category not found' })
    }

    return res.json({
      success: true,
      data: {
        id: updated.id,
        name: updated.name,
        pricePerKg: Number(updated.price_per_kg),
        updatedAt: updated.updated_at,
      },
    })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ success: false, error: 'Database error' })
  }
}
