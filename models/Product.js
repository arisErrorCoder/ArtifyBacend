const mongoose = require('mongoose');

const ProductSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please add a product name'],
    trim: true,
    maxlength: [100, 'Name cannot be more than 100 characters']
  },
  images: [{
    url: String,
    filename: String,
    format: String
  }],
  price: {
    type: Number,
    required: [true, 'Please add a price'],
    min: [0, 'Price must be at least 0']
  },
  originalPrice: {
    type: Number,
    min: [0, 'Price must be at least 0']
  },
  discount: String,
  category: {
    type: String,
    required: [true, 'Please add a category'],
    trim: true
  },
  subcategory: {
    type: String,
    trim: true
  },
  rating: {
    type: Number,
    min: [0, 'Rating must be at least 0'],
    max: [5, 'Rating cannot be more than 5'],
    default: 0
  },
  reviewCount: {
    type: Number,
    default: 0
  },
  size: String,
  revisions: {
    type: Number,
    default: 0
  },
  deliveryTime: String,
  quantityUnit: String,
  description: {
    type: String,
    required: [true, 'Please add a description']
  },
  clientNeedsToProvide: [String],
  features: [String],
  includes: [String],
  excludes: [String],
  status: {
    type: String,
    enum: ['active', 'inactive', 'draft'],
    default: 'draft'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('artifyProduct', ProductSchema);