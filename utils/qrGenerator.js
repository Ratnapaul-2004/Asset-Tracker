const QRCode = require('qrcode');
const dotenv = require('dotenv');

dotenv.config();

const HOST = process.env.APP_HOST || 'http://localhost:8080';

/**
 * Generate a base64 QR code pointing to asset detail route.
 * @param {string} assetId - MongoDB _id of the asset
 * @returns {Promise<string>} - base64 image URL
 */

const generateQR = async (assetId) => {
  try {
    const url = `${process.env.APP_HOST}/asset/${assetId}`;
    const qrImage = await QRCode.toDataURL(url);
    return qrImage;
  } catch(err) {
    console.error('❌ QR generation failed:', err);
    return null;
  }
};

module.exports = generateQR;