const { randomUUID } = require('crypto')
const fs = require('fs/promises')
const path = require('path')
const multer = require('multer')
const { PutObjectCommand } = require('@aws-sdk/client-s3')
const { s3Client, assertS3EnvVars, buildPublicFileUrl, getS3Config } = require('../utils/s3Config')

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024
const DEFAULT_S3_UPLOAD_TIMEOUT_MS = 90 * 1000
const MIN_S3_UPLOAD_TIMEOUT_MS = 10 * 1000
const MAX_S3_UPLOAD_TIMEOUT_MS = 10 * 60 * 1000
const DEFAULT_S3_CIRCUIT_BREAKER_MS = 5 * 60 * 1000
const MIN_S3_CIRCUIT_BREAKER_MS = 10 * 1000
const MAX_S3_CIRCUIT_BREAKER_MS = 30 * 60 * 1000

let s3CircuitOpenedUntil = 0

function clamp(value, minValue, maxValue) {
  return Math.min(maxValue, Math.max(minValue, value))
}

function parsePositiveInt(rawValue, fallbackValue) {
  const parsedValue = Number.parseInt(String(rawValue || ''), 10)

  if (!Number.isFinite(parsedValue) || parsedValue <= 0) {
    return fallbackValue
  }

  return parsedValue
}

function readBooleanEnv(name, defaultValue) {
  const normalized = String(process.env[name] || '')
    .trim()
    .toLowerCase()

  if (!normalized) {
    return defaultValue
  }

  if (['0', 'false', 'no', 'off'].includes(normalized)) {
    return false
  }

  if (['1', 'true', 'yes', 'on'].includes(normalized)) {
    return true
  }

  return defaultValue
}

function getUploadStorageMode() {
  const mode = String(process.env.UPLOAD_STORAGE_MODE || 'auto')
    .trim()
    .toLowerCase()

  if (mode === 's3' || mode === 'local' || mode === 'auto') {
    return mode
  }

  return 'auto'
}

function isLocalFallbackEnabled() {
  return readBooleanEnv('LOCAL_UPLOAD_FALLBACK_ENABLED', true)
}

function getS3UploadTimeoutMs() {
  const parsedValue = parsePositiveInt(process.env.S3_UPLOAD_TIMEOUT_MS, DEFAULT_S3_UPLOAD_TIMEOUT_MS)
  return clamp(parsedValue, MIN_S3_UPLOAD_TIMEOUT_MS, MAX_S3_UPLOAD_TIMEOUT_MS)
}

function getS3CircuitBreakerMs() {
  const parsedValue = parsePositiveInt(process.env.S3_CIRCUIT_BREAKER_MS, DEFAULT_S3_CIRCUIT_BREAKER_MS)
  return clamp(parsedValue, MIN_S3_CIRCUIT_BREAKER_MS, MAX_S3_CIRCUIT_BREAKER_MS)
}

function shouldBypassS3Temporarily() {
  return Date.now() < s3CircuitOpenedUntil
}

function openS3CircuitBreaker() {
  s3CircuitOpenedUntil = Date.now() + getS3CircuitBreakerMs()
}

function clearS3CircuitBreaker() {
  s3CircuitOpenedUntil = 0
}

function getLocalUploadRoot() {
  const configuredRoot = String(process.env.LOCAL_UPLOAD_ROOT || '').trim()

  if (configuredRoot) {
    return path.resolve(configuredRoot)
  }

  return path.resolve(process.cwd(), 'uploads')
}

function buildLocalUploadPath(objectKey) {
  const rootPath = getLocalUploadRoot()
  const normalizedKey = objectKey.replace(/^\/+/, '')
  const targetPath = path.resolve(rootPath, normalizedKey)

  if (!targetPath.startsWith(`${rootPath}${path.sep}`) && targetPath !== rootPath) {
    throw new Error('Invalid local upload key path')
  }

  return { rootPath, targetPath }
}

function encodeObjectKeyForUrl(objectKey) {
  return objectKey.split('/').map(encodeURIComponent).join('/')
}

function buildLocalPublicUrl(req, objectKey) {
  const encodedKey = encodeObjectKeyForUrl(objectKey)
  const forwardedProto = String(req.headers['x-forwarded-proto'] || req.protocol || 'http')
    .split(',')[0]
    .trim()
  const forwardedHost = String(req.headers['x-forwarded-host'] || req.get('host') || '')
    .split(',')[0]
    .trim()

  if (!forwardedHost) {
    return `/api/uploads/${encodedKey}`
  }

  return `${forwardedProto || 'http'}://${forwardedHost}/api/uploads/${encodedKey}`
}

async function saveLocalFallbackFile(objectKey, fileBuffer) {
  const { targetPath } = buildLocalUploadPath(objectKey)
  await fs.mkdir(path.dirname(targetPath), { recursive: true })
  await fs.writeFile(targetPath, fileBuffer)
}

function buildObjectKey(file) {
  const fileExtension = path.extname(file.originalname || '').toLowerCase()
  const safeExtension = fileExtension || '.jpg'
  return `reports/${Date.now()}-${randomUUID()}${safeExtension}`
}

function isLikelyS3ConnectivityError(err) {
  const signature = `${err?.name || ''} ${err?.message || ''}`.toLowerCase()

  return (
    signature.includes('abort') ||
    signature.includes('timeout') ||
    signature.includes('timed out') ||
    signature.includes('econn') ||
    signature.includes('enetunreach') ||
    signature.includes('ehostunreach') ||
    signature.includes('network')
  )
}

async function respondWithLocalUpload(req, res, context) {
  const { objectKey, fileBuffer, fileSize, startedAt, reason } = context

  await saveLocalFallbackFile(objectKey, fileBuffer)

  const publicUrl = buildLocalPublicUrl(req, objectKey)
  const durationMs = Date.now() - startedAt

  console.warn('Upload stored using local fallback:', {
    reason,
    objectKey,
    fileSize,
    durationMs,
    localRoot: getLocalUploadRoot(),
  })

  return res.status(201).json({
    success: true,
    message: 'Upload successful',
    data: {
      url: publicUrl,
      key: objectKey,
      bucket: 'local-fallback',
      storage: 'local',
    },
  })
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
  const objectKey = buildObjectKey(req.file)
  const storageMode = getUploadStorageMode()
  const localFallbackEnabled = isLocalFallbackEnabled()

  if (storageMode === 'local' || (storageMode === 'auto' && shouldBypassS3Temporarily())) {
    if (!localFallbackEnabled) {
      return res.status(503).json({
        success: false,
        error: 'Storage is temporarily unavailable. Please retry later.',
      })
    }

    try {
      return await respondWithLocalUpload(req, res, {
        objectKey,
        fileBuffer: req.file.buffer,
        fileSize,
        startedAt,
        reason: storageMode === 'local' ? 'mode-local' : 's3-circuit-breaker',
      })
    } catch (fallbackErr) {
      console.error('Local upload fallback failed:', {
        name: fallbackErr?.name,
        message: fallbackErr?.message,
        objectKey,
      })

      return res.status(500).json({ success: false, error: 'Failed to store uploaded file' })
    }
  }

  try {
    assertS3EnvVars()

    const { bucketName, region } = getS3Config()

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
    clearS3CircuitBreaker()

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
        storage: 's3',
      },
    })
  } catch (err) {
    const { bucketName, region } = getS3Config()
    const durationMs = Date.now() - startedAt
    const isTimeout = err?.name === 'AbortError'
    const isConnectivityError = isLikelyS3ConnectivityError(err)

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
      isConnectivityError,
    })

    if (storageMode === 'auto' && isConnectivityError) {
      openS3CircuitBreaker()
    }

    if (storageMode === 'auto' && localFallbackEnabled) {
      try {
        return await respondWithLocalUpload(req, res, {
          objectKey,
          fileBuffer: req.file.buffer,
          fileSize,
          startedAt,
          reason: isTimeout ? 's3-timeout' : 's3-error',
        })
      } catch (fallbackErr) {
        console.error('Local upload fallback after S3 failure also failed:', {
          name: fallbackErr?.name,
          message: fallbackErr?.message,
          objectKey,
        })
      }
    }

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
