require('dotenv').config();
const express = require('express');
const cors = require('cors');
const paymentRoutes = require('./routes/payment');
const connectDB = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const cartRoutes = require('./routes/cartRoutes');
const orderRoutes = require('./routes/orderRoutes');
const productRoutes = require('./routes/productRoutes');
const {errorHandler} = require('./middleware/error');
const path = require('path');
const fs = require('fs');
const app = express();
const PORT = process.env.PORT || 5000;
const cookieParser = require('cookie-parser');


connectDB();

// Mount routers

// Error handling middleware
app.use(errorHandler);
app.use(cookieParser  ());
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads/products')));
app.use('/uploads-cart', express.static(path.join(__dirname, 'uploads/cart')));



// Middleware

// Allow requests only from http://localhost:5175
app.use(cors());
app.use(express.json());

app.use('/api/payment/webhook', express.raw({ type: 'application/json' }));

// Routes

app.use('/api/orders', orderRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/products', productRoutes);


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
  // Create uploads directory if it doesn't exist
  const uploadDir = path.join(__dirname, 'public/uploads/products');
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }
});