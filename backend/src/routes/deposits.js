const express = require('express')
const router = express.Router()
const controller = require('../controllers/depositsController')
const { authRequired } = require('../middlewares/authMiddleware')

router.post('/', authRequired, controller.createDeposit)
router.get('/my', authRequired, controller.getMyDeposits)

module.exports = router
