const mongoose = require('mongoose');
const Asset = require('../models/Asset');
const idPrefixes = require('./idPrefixes');

const dotenv = require('dotenv');
dotenv.config();

async function fixManualIds() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("✅ Connected to MongoDB");

  const assets = await Asset.find();
  const counterMap = {}; // { MR: 3, PR: 2, ... }

  for (let asset of assets) {
    const prefix = idPrefixes[asset.name] || idPrefixes.Default;

    if (!counterMap[prefix]) counterMap[prefix] = 1;
    const padded = String(counterMap[prefix]++).padStart(3, '0');

    asset.manualId = `${prefix}${padded}`;
    await asset.save();
    console.log(`✔️ Updated: ${asset.name} → ${asset.manualId}`);
  }

  console.log("✅ All manual IDs updated.");
  mongoose.disconnect();
}

fixManualIds();