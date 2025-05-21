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
router.post('/', auth, addCustomer);   // POST /api/customers to add
router.get('/', auth, getCustomers);
router.get('/summary', auth, getSummary);
router.delete('/:customerId', auth, deleteCustomer);
 // Delete customer

module.exports = router;
