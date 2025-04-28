require('dotenv').config();
const express = require('express');
const cors = require('cors');
const paymentRoutes = require('./routes/payment');
const connectDB = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const cartRoutes = require('./routes/cartRoutes');
const orderRoutes = require('./routes/orderRoutes');
const productRoutes = require('./routes/productRoutes');
const couponRoutes = require('./routes/couponRoutes');
const dashboard = require('./routes/dashboard');
const faqRoutes = require('./routes/faqRoutes');
const rateLimit = require('express-rate-limit');
const contactRoutes = require('./routes/contactRoutes');
const newsletterRoutes = require('./routes/newsletterRoutes');
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
app.use('/uploads-cart', express.static(path.join(__dirname, 'public/uploads/cart/')));



// Middleware

// Allow requests only from http://localhost:5175
app.use(cors());
app.use(express.json());

app.use('/api/payment/webhook', express.raw({ type: 'application/json' }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 requests per windowMs
  message: 'Too many contact requests from this IP, please try again later'
});

// Routes
// Routes

app.use('/api/orders', orderRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/products', productRoutes);
app.use('/api/coupons', couponRoutes);
app.use('/api/dashboard', dashboard);
app.use('/api/faq', faqRoutes);
app.use('/api/newsletter', newsletterRoutes);
app.use('/api/reviews', require('./routes/reviewRoutes'));
app.use('/api/careers', require('./routes/careerRoutes'));
app.use('/api/contact', limiter, contactRoutes);




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