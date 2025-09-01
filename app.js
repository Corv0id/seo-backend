require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const morgan = require('morgan');
const cors = require('cors');
const connectDB = require('./src/config/db');

const app = express();

// Middleware
app.use(cors()); // Enable CORS for frontend requests
app.use(express.json()); // Parse JSON request bodies
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev')); // Log requests in development
}

// Connect to MongoDB Atlas
connectDB().then(() => {
  // Start server only after successful connection
  const port = process.env.PORT || 3000;
  app.listen(port, () => {
    console.log(`Server running on port ${port} in ${process.env.NODE_ENV} mode`);
  });
}).catch((err) => {
  console.error('Failed to start server due to MongoDB connection error:', err.message);
  process.exit(1); // Exit on connection failure
});

// Basic route to test server
app.get('/', (req, res) => {
  res.json({ message: 'SEO Audit API is running' });
});

// Import and mount routes
const userRoutes = require('./src/routes/userRoutes');
app.use('/api', userRoutes);

const adminRoutes = require('./src/routes/adminRoutes');
app.use('/api/admin', adminRoutes);

const auditRoutes = require('./src/routes/auditRoutes');
app.use('/api/audits', auditRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});