const mongoose = require('mongoose');

const assetSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  deviceClass: {
    type: String,
    required: true
  },
  owner: {
    type: String,
    required: true
  },
  description: {
    type: String
  },
  image: {
    type: String,
    default: '/images/default.jpg'
  },
  assetId: String,
  qrCode: String,
  uniqueTagNo: {
    type: String,
    unique: true
  },
  custodianName: {
    type: String,
    required: true
  },
  designation: String,
  employeeId: String,
  department: {
    type: String,
    required: true
  },
  deviceType: String,
  otherDeviceType: String,
  location: String,
  make: String,
  modelNo: {
    type: String,
    required: true
  },
  serialNo: String,
  stockNo: String,
  purchaseDate: {
    type: Date,
    required: true
  },
  operatingSystem: String,
  ipUserName: String,
  ipAddress: String,
  macAddress: String,
  manualId: {
    type: String,
    unique: true
  }
}, { timestamps: true });

module.exports = mongoose.model('Asset', assetSchema);