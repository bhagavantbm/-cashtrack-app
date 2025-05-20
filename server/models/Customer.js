const mongoose = require('mongoose');

const CustomerSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  name: String,
  phone: {
  type: String,
  required: true,
  match: /^[0-9]{10}$/, // Regex to allow exactly 10 digits only
},
  // ...
});

module.exports = mongoose.model('Customer', CustomerSchema);
