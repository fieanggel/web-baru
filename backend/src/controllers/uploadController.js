const { randomUUID } = require('crypto')
const path = require('path')
const multer = require('multer')
const { PutObjectCommand } = require('@aws-sdk/client-s3')
const { s3Client, assertS3EnvVars, buildPublicFileUrl, getS3Config } = require('../utils/s3Config')

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024
const DEFAULT_S3_UPLOAD_TIMEOUT_MS = 90 * 1000
const MIN_S3_UPLOAD_TIMEOUT_MS = 10 * 1000
const MAX_S3_UPLOAD_TIMEOUT_MS = 10 * 60 * 1000

function getS3UploadTimeoutMs() {
  const parsedValue = Number.parseInt(String(process.env.S3_UPLOAD_TIMEOUT_MS || ''), 10)

  if (!Number.isFinite(parsedValue) || parsedValue <= 0) {
    return DEFAULT_S3_UPLOAD_TIMEOUT_MS
  }

  return Math.min(MAX_S3_UPLOAD_TIMEOUT_MS, Math.max(MIN_S3_UPLOAD_TIMEOUT_MS, parsedValue))
}

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

  const startedAt = Date.now()
  const fileSize = req.file.size || req.file.buffer?.length || 0
  const timeoutMs = getS3UploadTimeoutMs()
  let objectKey = null

  try {
    assertS3EnvVars()

    const { bucketName, region } = getS3Config()
    const fileExtension = path.extname(req.file.originalname || '').toLowerCase()
    const safeExtension = fileExtension || '.jpg'
    objectKey = `reports/${Date.now()}-${randomUUID()}${safeExtension}`

    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: objectKey,
      Body: req.file.buffer,
      ContentType: req.file.mimetype,
    })

    const abortController = new AbortController()
    const timeoutHandle = setTimeout(() => abortController.abort(), timeoutMs)

    try {
      await s3Client.send(command, { abortSignal: abortController.signal })
    } finally {
      clearTimeout(timeoutHandle)
    }

    const publicUrl = buildPublicFileUrl(objectKey)
    const durationMs = Date.now() - startedAt

    console.info('S3 upload success:', {
      bucketName,
      region,
      objectKey,
      fileSize,
      durationMs,
    })

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
    const { bucketName, region } = getS3Config()
    const durationMs = Date.now() - startedAt
    const isTimeout = err?.name === 'AbortError'

    console.error('S3 upload failed:', {
      name: err?.name,
      message: err?.message,
      bucketName,
      region,
      objectKey,
      fileSize,
      timeoutMs,
      durationMs,
      isTimeout,
    })

    if (isTimeout) {
      return res.status(504).json({
        success: false,
        error: 'Upload timeout while contacting storage. Please retry.',
      })
    }

    return res.status(500).json({ success: false, error: 'Failed to upload file to S3' })
  }
}

module.exports = {
  uploadSinglePhoto,
  uploadPhoto,
}
