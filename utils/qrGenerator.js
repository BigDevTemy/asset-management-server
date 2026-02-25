'use strict'

const QRCode = require('qrcode')
const Jimp = require('jimp')
const fs = require('fs').promises
const logger = require('./logger')

const DEFAULT_QR_OPTIONS = {
  width: 400,
  margin: 2,
  errorCorrectionLevel: 'M', // bumped to H automatically when a logo is used
}

/**
 * Generate a QR code PNG file for the provided payload.
 * Supports optional logo overlay at the center while keeping high error correction.
 *
 * @param {string|Object} data - String or object to encode in the QR code.
 * @param {string} outputPath - Absolute path to save the QR image.
 * @param {Object} options - Optional QR code options.
 * @param {string} [options.logoPath] - Path to a logo image to place at the center.
 * @param {Buffer} [options.logoBuffer] - Raw buffer for the logo image.
 * @param {number} [options.logoScale=0.2] - Portion of QR width used for logo (0.08 - 0.35).
 * @returns {Promise<string>} - Resolves to the saved file path.
 */
async function generateQrCodeFile(data, outputPath, options = {}) {
  try {
    const payload =
      typeof data === 'string' ? data : JSON.stringify(data, null, 0)

    const { logoPath, logoBuffer, logoScale, ...restOptions } = options || {}
    const hasLogo = Boolean(logoPath || logoBuffer)
    const qrOptions = {
      ...DEFAULT_QR_OPTIONS,
      ...restOptions,
      errorCorrectionLevel:
        restOptions.errorCorrectionLevel ||
        (hasLogo ? 'H' : DEFAULT_QR_OPTIONS.errorCorrectionLevel),
    }

    const qrBuffer = await QRCode.toBuffer(payload, qrOptions)

    // Fast path: no logo requested
    if (!hasLogo) {
      await fs.writeFile(outputPath, qrBuffer)
      logger.info('QR code file saved', { path: outputPath })
      return outputPath
    }

    const qrImage = await Jimp.read(qrBuffer)
    const logoImage = await Jimp.read(logoBuffer || logoPath)

    const qrWidth = qrImage.getWidth()
    const qrHeight = qrImage.getHeight()

    // Clamp logo scale to avoid obscuring too much of the code
    const clampedScale = Math.min(Math.max(logoScale || 0.2, 0.08), 0.35)
    const targetLogoSize = Math.floor(qrWidth * clampedScale)

    // Resize logo and add a white background to preserve contrast
    logoImage.contain(targetLogoSize, targetLogoSize, Jimp.RESIZE_BILINEAR)
    const padding = Math.max(Math.floor(targetLogoSize * 0.15), 6)
    const bgSize = targetLogoSize + padding * 2
    const logoBg = new Jimp(bgSize, bgSize, 0xffffffff)

    const logoX = (bgSize - logoImage.getWidth()) / 2
    const logoY = (bgSize - logoImage.getHeight()) / 2
    logoBg.composite(logoImage, logoX, logoY)

    const offsetX = (qrWidth - bgSize) / 2
    const offsetY = (qrHeight - bgSize) / 2

    qrImage.composite(logoBg, offsetX, offsetY)

    await qrImage.writeAsync(outputPath)

    logger.info('QR code with logo saved', {
      path: outputPath,
      logoScale: clampedScale,
      errorCorrection: qrOptions.errorCorrectionLevel,
    })
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
