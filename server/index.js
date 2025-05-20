require('dotenv').config();

const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

const authRoutes = require('./routes/auth');
const customerRoutes = require('./routes/customer');
const transactionRoutes = require('./routes/transaction');

const app = express();
const PORT = process.env.PORT || 5000;
const mongoURI = process.env.MONGO_URI;

// Define your allowed origins here:
const allowedOrigins = [
  'https://cashtrack-app-ze74.vercel.app',   // your Vercel frontend URL
  'https://cashtrack-app-seven.vercel.app',  // other frontend if you use
  'http://localhost:3000'                     // local frontend testing
];

// Middleware
app.use(express.json());

// CORS middleware - must be BEFORE routes
app.use(cors({
  origin: function(origin, callback){
    // allow requests with no origin like Postman, curl
    if(!origin) return callback(null, true);
    if(allowedOrigins.indexOf(origin) === -1){
      const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  },
  credentials: true
}));

app.get('/', (req, res) => {
  res.send('Backend server is running');
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/transactions', transactionRoutes);

// MongoDB connection and server start
mongoose
  .connect(mongoURI)
  .then(() => {
    console.log('✅ Connected to MongoDB');
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('❌ MongoDB connection error:', err);
  });
