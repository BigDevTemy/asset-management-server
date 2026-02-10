/**
 * Barcode Generator Utility
 * Generates Code 128 barcodes for assets using bwip-js
 */

const bwipjs = require('bwip-js');
const logger = require('./logger');
const path = require('path');
const fs = require('fs').promises;

/**
 * Barcode configuration constants
 */
const BARCODE_CONFIG = {
  TYPE: 'code128',           // Code 128 barcode type
  SCALE_X: 3,                // Horizontal scaling factor
  SCALE_Y: 3,                // Vertical scaling factor
  HEIGHT: 10,                // Bar height in millimeters
  INCLUDE_TEXT: true,        // Include human-readable text
  TEXT_SIZE: 10,             // Font size for human-readable text
  TEXT_POSITION: 'bottom',   // Position of the text
  BACKGROUND_COLOR: 'FFFFFF', // White background
  BAR_COLOR: '000000',       // Black bars
  PADDING: 10                // Padding around barcode in pixels
};

/**
 * Generate barcode image buffer
 * @param {string} text - Text to encode in the barcode (e.g., asset_tag or serial_number)
 * @param {Object} options - Optional configuration overrides
 * @returns {Promise<Buffer>} - PNG image buffer of the barcode
 */
async function generateBarcodeBuffer(text, options = {}) {
  try {
    if (!text || typeof text !== 'string') {
      throw new Error('Barcode text must be a non-empty string');
    }

    // Merge default config with custom options
    const config = {
      bcid: options.type || BARCODE_CONFIG.TYPE,
      text: text.toString(),
      scale: options.scale || BARCODE_CONFIG.SCALE_X,
      height: options.height || BARCODE_CONFIG.HEIGHT,
      includetext: options.includeText !== undefined ? options.includeText : BARCODE_CONFIG.INCLUDE_TEXT,
      textxalign: 'center',
      backgroundcolor: options.backgroundColor || BARCODE_CONFIG.BACKGROUND_COLOR,
      barcolor: options.barColor || BARCODE_CONFIG.BAR_COLOR,
      padding: options.padding || BARCODE_CONFIG.PADDING
    };

    // Generate barcode as PNG buffer
    const buffer = await bwipjs.toBuffer(config);
    
    logger.info('Barcode generated successfully', { 
      text, 
      type: config.bcid,
      size: buffer.length 
    });

    return buffer;
  } catch (error) {
    logger.error('Failed to generate barcode', { 
      text, 
      error: error.message,
      stack: error.stack 
    });
    throw new Error(`Barcode generation failed: ${error.message}`);
  }
}

/**
 * Generate barcode and save to file
 * @param {string} text - Text to encode in the barcode
 * @param {string} outputPath - Full path where the barcode image will be saved
 * @param {Object} options - Optional configuration overrides
 * @returns {Promise<string>} - Path to the saved barcode image
 */
async function generateBarcodeFile(text, outputPath, options = {}) {
  try {
    // Generate barcode buffer
    const buffer = await generateBarcodeBuffer(text, options);

    // Ensure directory exists
    const directory = path.dirname(outputPath);
    await fs.mkdir(directory, { recursive: true });

    // Save buffer to file
    await fs.writeFile(outputPath, buffer);

    logger.info('Barcode file saved successfully', { 
      text, 
      path: outputPath 
    });

    return outputPath;
  } catch (error) {
    logger.error('Failed to save barcode file', { 
      text, 
      outputPath, 
      error: error.message 
    });
    throw new Error(`Failed to save barcode file: ${error.message}`);
  }
}

/**
 * Generate barcode number from asset id
 * Example: ASSET-000123
 * 
 * @param {number} assetId - Asset ID
 * @returns {string} - Generated barcode string
 */
function generateAssetBarcodeNumber(assetId) {
  if (!Number.isFinite(assetId)) {
    throw new Error('Asset ID must be a finite number');
  }

  const barcodeNumber = `ASSET-${assetId.toString().padStart(6, '0')}`;

  logger.info('Generated barcode number', {
    assetId,
    barcodeNumber,
    pattern: 'ASSET-<zero-padded asset_id>',
  });

  return barcodeNumber;
}

module.exports = {
  generateBarcodeBuffer,
  generateBarcodeFile,
  generateAssetBarcodeNumber,
  BARCODE_CONFIG
};

