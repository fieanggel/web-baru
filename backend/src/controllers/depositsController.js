const categoryModel = require('../models/categoryModel')
const depositModel = require('../models/depositModel')

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

exports.createDeposit = async (req, res) => {
  const userId = Number(req.user?.id)
  const categoryId = Number(req.body?.categoryId ?? req.body?.category_id)
  const estimatedWeight = Number(req.body?.estimatedWeight ?? req.body?.estimated_weight)
  const rawReportPhotoUrl = req.body?.reportPhotoUrl ?? req.body?.report_photo_url
  let reportPhotoUrl = null

  if (!Number.isInteger(userId) || userId <= 0) {
    return res.status(401).json({ success: false, error: 'Unauthorized user context' })
  }

  if (!Number.isInteger(categoryId) || categoryId <= 0) {
    return res.status(400).json({ success: false, error: 'Valid categoryId is required' })
  }

  if (!Number.isFinite(estimatedWeight) || estimatedWeight <= 0) {
    return res
      .status(400)
      .json({ success: false, error: 'estimatedWeight must be a positive number' })
  }

  if (rawReportPhotoUrl === undefined || rawReportPhotoUrl === null || !String(rawReportPhotoUrl).trim()) {
    return res.status(400).json({ success: false, error: 'reportPhotoUrl is required' })
  }

  const normalizedUrl = String(rawReportPhotoUrl).trim()

  try {
    const parsed = new URL(normalizedUrl)
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      throw new Error('Unsupported URL protocol')
    }

    reportPhotoUrl = normalizedUrl
  } catch (err) {
    return res.status(400).json({
      success: false,
      error: 'reportPhotoUrl must be a valid http/https URL',
    })
  }

  try {
    const category = await categoryModel.getById(categoryId)
    if (!category) {
      return res.status(404).json({ success: false, error: 'Category not found' })
    }

    const created = await depositModel.createDeposit({
      userId,
      categoryId,
      estimatedWeight,
      reportPhotoUrl,
    })

    return res.status(201).json({
      success: true,
      data: {
        id: created.id,
        userId: created.user_id,
        categoryId: created.category_id,
        categoryName: created.category_name,
        estimatedWeight: Number(created.estimated_weight),
        actualWeight: created.actual_weight === null ? null : Number(created.actual_weight),
        pointsEarned: Number(created.points_earned),
        reportPhotoUrl: created.report_photo_url || null,
        status: created.status,
        createdAt: created.created_at,
      },
    })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ success: false, error: 'Database error' })
  }
}

exports.getMyDeposits = async (req, res) => {
  const userId = Number(req.user?.id)

  if (!Number.isInteger(userId) || userId <= 0) {
    return res.status(401).json({ success: false, error: 'Unauthorized user context' })
  }

  try {
    const deposits = await depositModel.listByUser(userId)

    return res.json({
      success: true,
      data: deposits.map(item => ({
        id: item.id,
        categoryName: item.category_name,
        estimatedWeight: Number(item.estimated_weight),
        actualWeight: item.actual_weight === null ? null : Number(item.actual_weight),
        pointsEarned: Number(item.points_earned),
        reportPhotoUrl: item.report_photo_url || null,
        status: item.status,
        date: formatDashboardDate(item.created_at),
        createdAt: item.created_at,
      })),
    })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ success: false, error: 'Database error' })
  }
}
