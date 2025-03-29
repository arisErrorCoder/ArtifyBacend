require('dotenv').config();
const express = require('express');
const cors = require('cors');
const paymentRoutes = require('./routes/payment');
const connectDB = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const errorHandler = require('./middleware/error');
const app = express();
const PORT = process.env.PORT || 5000;


connectDB();

// Mount routers

// Error handling middleware
app.use(errorHandler);



// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/payment', paymentRoutes);
app.use('/api/auth', authRoutes);

// Health check
app.get('/', (req, res) => {
  res.send('Stripe Payment Backend is running');
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});