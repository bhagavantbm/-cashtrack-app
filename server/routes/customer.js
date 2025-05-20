const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');

const {
  addCustomer,
  getCustomers,
  deleteCustomer,
  getSummary
} = require('../controllers/customerController');

// Routes
router.post('/add', auth, addCustomer);
router.get('/', auth, getCustomers);
router.get('/summary', auth, getSummary);
router.delete('/:customerId', auth, deleteCustomer);

module.exports = router;
