const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const transactionController = require('../controllers/transactionController');

router.post('/add', auth, transactionController.addTransaction);
router.get('/:customerId', auth, transactionController.getTransactions);

module.exports = router;
