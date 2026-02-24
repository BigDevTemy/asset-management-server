'use strict'

const QRCode = require('qrcode')
const logger = require('./logger')

const DEFAULT_QR_OPTIONS = {
  width: 400,
  margin: 2,
  errorCorrectionLevel: 'M',
}

/**
 * Generate a QR code PNG file for the provided payload.
 * @param {string|Object} data - String or object to encode in the QR code.
 * @param {string} outputPath - Absolute path to save the QR image.
 * @param {Object} options - Optional QR code options (width, margin, ecc).
 * @returns {Promise<string>} - Resolves to the saved file path.
 */
async function generateQrCodeFile(data, outputPath, options = {}) {
  try {
    const payload =
      typeof data === 'string' ? data : JSON.stringify(data, null, 0)

    await QRCode.toFile(outputPath, payload, {
      ...DEFAULT_QR_OPTIONS,
      ...options,
    })

    logger.info('QR code file saved', { path: outputPath })
    return outputPath
  } catch (error) {
    logger.error('Failed to generate QR code', {
      error: error.message,
      outputPath,
    })
    throw new Error(`Failed to generate QR code: ${error.message}`)
  }
}

module.exports = {
  generateQrCodeFile,
}
