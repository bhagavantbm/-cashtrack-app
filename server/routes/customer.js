const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');

const {
  addCustomer,
  getCustomers,
  deleteCustomer,
  getSummary
} = require('../controllers/customerController');

// Corrected Routes
router.post('/', auth, addCustomer);             // Add customer
router.get('/', auth, getCustomers);             // Get customers
router.get('/summary', auth, getSummary);        // Get summary
router.delete('/:customerId', auth, deleteCustomer); // Delete customer

module.exports = router;
