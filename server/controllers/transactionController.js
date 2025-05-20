const Transaction = require('../models/Transaction');
const Customer = require('../models/Customer');

// Add a new transaction
exports.addTransaction = async (req, res) => {
  try {
    const { customerId, type, amount, description = '', paymentMethod } = req.body;

    if (!customerId || !paymentMethod || !type || amount == null) {
      return res.status(400).json({ error: 'customerId, type, amount and paymentMethod are required' });
    }

    if (!['received', 'paid'].includes(type)) {
      return res.status(400).json({ error: 'Invalid transaction type' });
    }

    if (amount <= 0) {
      return res.status(400).json({ error: 'Amount must be greater than zero' });
    }

    const customer = await Customer.findOne({ _id: customerId, userId: req.user.id });
    if (!customer) {
      return res.status(404).json({ error: 'Customer not found or unauthorized' });
    }

    const transaction = new Transaction({
      customer: customerId,
      userId: req.user.id,
      type,
      amount,
      description,
      paymentMethod,
      // date will default if not provided
    });

    await transaction.save();

    res.status(201).json({ message: 'Transaction added successfully', transaction });
  } catch (error) {
    console.error('Add transaction error:', error);
    res.status(500).json({ error: 'Failed to add transaction', details: error.message });
  }
};

// Get all transactions for a customer
exports.getTransactions = async (req, res) => {
  try {
    const userId = req.user.id;
    const { customerId } = req.params;

    // Fix here as well
    const customer = await Customer.findOne({ _id: customerId, userId: userId });
    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    // Fix here too - match your Transaction schema field for user reference
    const transactions = await Transaction.find({ customer: customerId, userId: userId }).sort({ date: -1 });

    return res.json({ customer, transactions });
  } catch (error) {
    console.error('Get transactions error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};
