const { S3Client } = require('@aws-sdk/client-s3')

const requiredS3EnvVars = [
  'AWS_ACCESS_KEY_ID',
  'AWS_SECRET_ACCESS_KEY',
  'AWS_REGION',
  'AWS_S3_BUCKET_NAME',
]

function readEnv(name) {
  const rawValue = process.env[name]

  if (rawValue === undefined || rawValue === null) {
    return ''
  }

  let cleaned = String(rawValue)
    .replace(/\\[rnt]/g, '')
    .replace(/[\r\n\t]/g, '')
    .trim()

  if (
    (cleaned.startsWith('"') && cleaned.endsWith('"')) ||
    (cleaned.startsWith("'") && cleaned.endsWith("'"))
  ) {
    cleaned = cleaned
      .slice(1, -1)
      .replace(/\\[rnt]/g, '')
      .replace(/[\r\n\t]/g, '')
      .trim()
  }

  return cleaned
}

function getS3Config() {
  return {
    accessKeyId: readEnv('AWS_ACCESS_KEY_ID'),
    secretAccessKey: readEnv('AWS_SECRET_ACCESS_KEY'),
    region: readEnv('AWS_REGION') || 'us-east-1',
    bucketName: readEnv('AWS_S3_BUCKET_NAME'),
  }
}

function getMissingS3EnvVars() {
  return requiredS3EnvVars.filter(name => !readEnv(name))
}

function assertS3EnvVars() {
  const missing = getMissingS3EnvVars()

  if (missing.length > 0) {
    throw new Error(`Missing required AWS env vars: ${missing.join(', ')}`)
  }
}

const s3Config = getS3Config()

const s3Client = new S3Client({
  region: s3Config.region,
  credentials:
    s3Config.accessKeyId && s3Config.secretAccessKey
      ? {
          accessKeyId: s3Config.accessKeyId,
          secretAccessKey: s3Config.secretAccessKey,
        }
      : undefined,
})

function buildPublicFileUrl(key) {
  const { bucketName, region } = getS3Config()

  if (region === 'us-east-1') {
    return `https://${bucketName}.s3.amazonaws.com/${key}`
  }

  return `https://${bucketName}.s3.${region}.amazonaws.com/${key}`
}

module.exports = {
  s3Client,
  assertS3EnvVars,
  buildPublicFileUrl,
  getS3Config,
}
