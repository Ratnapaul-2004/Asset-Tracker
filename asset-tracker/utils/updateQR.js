const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const generateQR = require('./qrGenerator');
const Asset = require('../models/Asset');

dotenv.config({path: path.resolve(__dirname, '../.env')});

const MONGO_URI = process.env.MONGO_URI;

async function updateAllQRCodes() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB');
    const assets = await Asset.find();

    for(let asset of assets) {
      const newQR = await generateQR(asset._id);
      asset.qrCode = newQR;
      await asset.save();
      console.log(`✅ Updated QR for: ${asset.name} (${asset._id})`);
    }
    console.log('All Qr codes updated successfully');
    process.exit(0);
  } catch (err) {
    console.error('❌ Failed to update QR codes:', err);
    process.exit(1);
  }
}

updateAllQRCodes();