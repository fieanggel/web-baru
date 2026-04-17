const { randomUUID } = require('crypto')
const path = require('path')
const multer = require('multer')
const { PutObjectCommand } = require('@aws-sdk/client-s3')
const { s3Client, assertS3EnvVars, buildPublicFileUrl, getS3Config } = require('../utils/s3Config')

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_FILE_SIZE_BYTES,
  },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype || !file.mimetype.startsWith('image/')) {
      cb(new Error('Only image files are allowed'))
      return
    }

    cb(null, true)
  },
})

function uploadSinglePhoto(req, res, next) {
  upload.single('photo')(req, res, err => {
    if (!err) {
      next()
      return
    }

    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          success: false,
          error: 'File is too large. Maximum upload size is 5 MB.',
        })
      }

      return res.status(400).json({ success: false, error: err.message })
    }

    return res.status(400).json({ success: false, error: err.message || 'Invalid upload request' })
  })
}

async function uploadPhoto(req, res) {
  if (!req.file) {
    return res.status(400).json({ success: false, error: 'photo file is required' })
  }

  try {
    assertS3EnvVars()

    const { bucketName } = getS3Config()
    const fileExtension = path.extname(req.file.originalname || '').toLowerCase()
    const safeExtension = fileExtension || '.jpg'
    const objectKey = `reports/${Date.now()}-${randomUUID()}${safeExtension}`

    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: objectKey,
      Body: req.file.buffer,
      ContentType: req.file.mimetype,
    })

    await s3Client.send(command)

    const publicUrl = buildPublicFileUrl(objectKey)

    return res.status(201).json({
      success: true,
      message: 'Upload successful',
      data: {
        url: publicUrl,
        key: objectKey,
        bucket: bucketName,
      },
    })
  } catch (err) {
    console.error('S3 upload failed:', err)
    return res.status(500).json({ success: false, error: 'Failed to upload file to S3' })
  }
}

module.exports = {
  uploadSinglePhoto,
  uploadPhoto,
}
