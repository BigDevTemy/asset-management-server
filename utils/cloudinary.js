'use strict'

const cloudinary = require('cloudinary').v2
const logger = require('./logger')

const isConfigured = Boolean(
  process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET,
)

if (isConfigured) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  })
} else {
  logger.warn('Cloudinary not configured – camera uploads will fail until env vars are set')
}

/**
 * Uploads a base64-encoded image to Cloudinary.
 * @param {string} base64String data URI or raw base64 string
 * @param {object} options optional upload options
 * @returns {Promise<string>} secure URL of the uploaded image
 */
async function uploadBase64Image(base64String, options = {}) {
  if (!isConfigured) {
    throw new Error('Cloudinary credentials are not configured')
  }

  const folder = options.folder || process.env.CLOUDINARY_UPLOAD_FOLDER || 'asset_captures'

  const uploadResult = await cloudinary.uploader.upload(base64String, {
    folder,
    resource_type: 'image',
    overwrite: false,
  })

  return uploadResult.secure_url || uploadResult.url
}

module.exports = {
  cloudinary,
  uploadBase64Image,
  isCloudinaryConfigured: isConfigured,
}
