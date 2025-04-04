const mongoose = require('mongoose');


const orderSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ArtifyUser',
    required: true
  },
  items: [{
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'artifyProduct' },
    productId: { type: String }, // Make optional if possible
    name: { type: String },      // Make optional if possible
    image: { type: String },     // Make optional if possible
    quantity: Number,
    price: Number,
    clientInfo: Object,
    files: [{
      name: String,
      url: String
    }]
  }],
  subtotal: {
    type: Number,
    required: true
  },
  gst: {
    type: Number,
    required: true
  },
  discount: {
    type: Number,
    default: 0
  },
  total: {
    type: Number,
    required: true
  },
  coupon: {
    code: String,
    discount: Number
  },
  paymentIntentId: {
    type: String,
    required: true,
    unique: true
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'succeeded', 'failed', 'refunded'],
    default: 'pending'
  },
  orderStatus: {
    type: String,
    enum: ['processing', 'designed', 'delivered', 'cancelled'],
    default: 'processing'
  },
  billingDetails: {
    firstName: String,
    lastName: String,
    email: String,
    phone: String,
    address: String,
    city: String,
    state: String,
    zipCode: String,
    country: String,
    organizationName: String,
    organizationEmail: String,
    gstNumber: String
  },
  shippingDetails: {
    name: String,
    address: String,
    city: String,
    state: String,
    zipCode: String,
    country: String
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Add indexes for better performance
orderSchema.index({ user: 1 });
orderSchema.index({ paymentIntentId: 1 });
orderSchema.index({ createdAt: -1 });
orderSchema.index({ paymentStatus: 1 });
orderSchema.index({ orderStatus: 1 });

const Order = mongoose.model('artifyOrder', orderSchema);

module.exports = Order;