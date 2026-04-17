const { S3Client } = require('@aws-sdk/client-s3')

const requiredS3EnvVars = [
  'AWS_ACCESS_KEY_ID',
  'AWS_SECRET_ACCESS_KEY',
  'AWS_REGION',
  'AWS_S3_BUCKET_NAME',
]

function getMissingS3EnvVars() {
  return requiredS3EnvVars.filter(name => !process.env[name])
}

function assertS3EnvVars() {
  const missing = getMissingS3EnvVars()

  if (missing.length > 0) {
    throw new Error(`Missing required AWS env vars: ${missing.join(', ')}`)
  }
}

const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'ap-southeast-1',
  credentials:
    process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY
      ? {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        }
      : undefined,
})

function buildPublicFileUrl(key) {
  const bucketName = process.env.AWS_S3_BUCKET_NAME
  const region = process.env.AWS_REGION

  if (region === 'us-east-1') {
    return `https://${bucketName}.s3.amazonaws.com/${key}`
  }

  return `https://${bucketName}.s3.${region}.amazonaws.com/${key}`
}

module.exports = {
  s3Client,
  assertS3EnvVars,
  buildPublicFileUrl,
}
