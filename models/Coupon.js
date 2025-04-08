const mongoose = require('mongoose');

const couponSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  discountType: {
    type: String,
    required: true,
    enum: ['percentage', 'fixed'],
    default: 'percentage'
  },
  discountValue: {
    type: Number,
    required: true,
    min: 0
  },
  minOrderAmount: {
    type: Number,
    default: 0
  },
  maxDiscountAmount: {
    type: Number
  },
  startDate: {
    type: Date,
    required: true,
    default: Date.now
  },
  endDate: {
    type: Date,
    required: true
  },
  maxUses: {
    type: Number,
    default: null
  },
  currentUses: {
    type: Number,
    default: 0
  },
  userSpecific: {
    type: Boolean,
    default: false
  },
  allowedUsers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ArtifyUser'
  }],
  categories: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category'
  }],
  products: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'artifyProduct'
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Index for faster lookup
couponSchema.index({ code: 1, isActive: 1 });

// Pre-save hook to uppercase the code
couponSchema.pre('save', function(next) {
  this.code = this.code.toUpperCase();
  next();
});

// Static method to validate coupon
couponSchema.statics.validateCoupon = async function(code, userId, cartAmount, cartItems) {
  const coupon = await this.findOne({ code, isActive: true });
  
  if (!coupon) {
    throw new Error('Invalid coupon code');
  }

  // Check date validity
  const now = new Date();
  if (now < coupon.startDate || now > coupon.endDate) {
    throw new Error('Coupon is not valid at this time');
  }

  // Check max uses
  if (coupon.maxUses && coupon.currentUses >= coupon.maxUses) {
    throw new Error('Coupon has reached its maximum usage limit');
  }

  // Check min order amount
  if (coupon.minOrderAmount && cartAmount < coupon.minOrderAmount) {
    throw new Error(`Minimum order amount of ₹${coupon.minOrderAmount} required for this coupon`);
  }

  // Check user specificity
  if (coupon.userSpecific && (!userId || !coupon.allowedUsers.includes(userId))) {
    throw new Error('This coupon is not valid for your account');
  }

  // Check product/category restrictions if any
  if (coupon.products.length > 0 || coupon.categories.length > 0) {
    const validItems = cartItems.some(item => {
      return coupon.products.includes(item.productId) || 
             coupon.categories.includes(item.categoryId);
    });
    
    if (!validItems) {
      throw new Error('Coupon not applicable to any items in your cart');
    }
  }

  return coupon;
};

module.exports = mongoose.model('artifyCoupon', couponSchema);

