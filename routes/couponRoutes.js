const express = require('express');
const Coupon = require('../models/Coupon');
const { protect } = require('../middleware/auth');

const router = express.Router();

// Create a new coupon
router.post('/', async (req, res) => {
  try {
    const coupon = new Coupon(req.body);
    await coupon.save();
    res.status(201).send(coupon);
  } catch (error) {
    res.status(400).send({ error: error.message });
  }
});

// Get all coupons
router.get('/', async (req, res) => {
  try {
    const coupons = await Coupon.find({});
    res.send(coupons);
  } catch (error) {
    res.status(500).send({ error: 'Failed to fetch coupons' });
  }
});

// Update a coupon
router.patch('/:id', async (req, res) => {
  try {
    const coupon = await Coupon.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!coupon) {
      return res.status(404).send({ error: 'Coupon not found' });
    }
    res.send(coupon);
  } catch (error) {
    res.status(400).send({ error: error.message });
  }
});

// Delete a coupon
router.delete('/:id', async (req, res) => {
  try {
    const coupon = await Coupon.findByIdAndDelete(req.params.id);
    if (!coupon) {
      return res.status(404).send({ error: 'Coupon not found' });
    }
    res.send({ message: 'Coupon deleted successfully' });
  } catch (error) {
    res.status(500).send({ error: 'Failed to delete coupon' });
  }
});

// Validate a coupon (only requires login)
router.post('/validate', protect, async (req, res) => {
  try {
    const { code, cartAmount, cartItems } = req.body;
    const userId = req.user._id;

    const coupon = await Coupon.validateCoupon(code, userId, cartAmount, cartItems);

    let discountAmount = 0;
    if (coupon.discountType === 'percentage') {
      discountAmount = cartAmount * (coupon.discountValue / 100);
      if (coupon.maxDiscountAmount) {
        discountAmount = Math.min(discountAmount, coupon.maxDiscountAmount);
      }
    } else {
      discountAmount = Math.min(coupon.discountValue, cartAmount);
    }

    res.send({
      valid: true,
      coupon: {
        code: coupon.code,
        description: coupon.description,
        discountType: coupon.discountType,
        discountValue: coupon.discountValue,
        discountAmount,
        maxDiscountAmount: coupon.maxDiscountAmount
      }
    });
  } catch (error) {
    res.status(400).send({ valid: false, error: error.message });
  }
});

module.exports = router;
