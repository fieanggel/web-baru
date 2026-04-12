const express = require('express')
const router = express.Router()
const controller = require('../controllers/adminController')

router.get('/dashboard', controller.getDashboardOverview)
router.get('/monitoring-queue', controller.getMonitoringQueue)
router.get('/categories', controller.getAdminCategories)
router.put('/categories/:id', controller.updateCategoryPrice)
router.patch('/deposits/approve/:id', controller.approveDeposit)
router.patch('/deposits/reject/:id', controller.rejectDeposit)

module.exports = router
