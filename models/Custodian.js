const mongoose = require('mongoose');

const custodianSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  designation: String,
  employeeId: {
    type: String,
    required: true, 
    unique: true
  },
  department: String,
  email: {
    type: String,
    required: true,
    unique: true
  }
});

module.exports = mongoose.model('Custodian', custodianSchema);