const express = require('express')
const router = express.Router()
const controller = require('../controllers/uploadController')

router.post('/', controller.uploadSinglePhoto, controller.uploadPhoto)

module.exports = router
