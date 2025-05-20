const Customer = require('../models/Customer');
const Transaction = require('../models/Transaction');
const mongoose = require('mongoose');



exports.addCustomer = async (req, res) => {
  try {
    const { name, phone } = req.body;

    if (!name || !phone) {
      return res.status(400).json({ error: 'Name and phone are required' });
    }

    const customer = await Customer.create({
      userId: req.user.id,
      name,
      phone,
    });

    res.status(201).json(customer);
  } catch (err) {
    console.error('Add customer error:', err);
    res.status(500).json({ error: 'Error creating customer' });
  }
};

exports.getCustomers = async (req, res) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.user.id);

    const customers = await Customer.aggregate([
      { $match: { userId } },
      {
        $lookup: {
          from: 'transactions',
          localField: '_id',
          foreignField: 'customer',
          as: 'transactions',
        },
      },
      {
        $addFields: {
          received: {
            $sum: {
              $map: {
                input: '$transactions',
                as: 't',
                in: {
                  $cond: [{ $eq: ['$$t.type', 'received'] }, '$$t.amount', 0],
                },
              },
            },
          },
          paid: {
            $sum: {
              $map: {
                input: '$transactions',
                as: 't',
                in: {
                  $cond: [{ $eq: ['$$t.type', 'paid'] }, '$$t.amount', 0],
                },
              },
            },
          },
        },
      },
      {
        $project: {
          name: 1,
          phone: 1,
          received: 1,
          paid: 1,
        },
      },
      { $sort: { createdAt: -1 } },
    ]);

    res.json(customers);
  } catch (error) {
    console.error('Get customers error:', error);
    res.status(500).json({ error: 'Failed to fetch customers' });
  }
};

exports.deleteCustomer = async (req, res) => {
  try {
    const userId = req.user.id;
    const customerId = req.params.customerId;

    const customer = await Customer.findOneAndDelete({ _id: customerId, userId });

    if (!customer) {
      return res.status(404).json({ error: 'Customer not found or unauthorized' });
    }

    await Transaction.deleteMany({ customer: customerId, userId });

    res.json({ message: 'Customer and transactions deleted successfully' });
  } catch (err) {
    console.error('Delete customer error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

exports.getSummary = async (req, res) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.user.id);

    const totals = await Transaction.aggregate([
      { $match: { userId } },
      {
        $group: {
          _id: '$type',
          totalAmount: { $sum: '$amount' },
        },
      },
    ]);

    let totalReceived = 0;
    let totalPaid = 0;

    totals.forEach((item) => {
      if (item._id === 'received') totalReceived = item.totalAmount;
      if (item._id === 'paid') totalPaid = item.totalAmount;
    });

    const balance = totalReceived - totalPaid;

    res.json({ totalReceived, totalPaid, balance });
  } catch (error) {
    console.error('Get summary error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};
