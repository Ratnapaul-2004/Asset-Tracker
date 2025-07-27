const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ['admin', 'trainee'],
    // default: 'trainee'
  },
  designation: {
    type: String,
    default: 'None'
  },
  employeeId: {
    type: String,
    default: 'None'
  },
  department: {
    type: String,
    default: 'None'
  }
});

module.exports = mongoose.model('User', userSchema);