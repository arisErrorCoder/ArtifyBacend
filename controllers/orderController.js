const Order = require('../models/Order');
const { sendOrderConfirmationEmail, sendOrderStatusUpdateEmail } = require('../services/emailService');

// Create a new order
exports.createOrder = async (req, res) => {
  try {
    const { 
      user,
      items,
      subtotal,
      gst,
      discount,
      total,
      coupon,
      paymentIntentId,
      billingDetails
    } = req.body;

    // Create shipping details from billing details
    const shippingDetails = {
      name: `${billingDetails.firstName} ${billingDetails.lastName}`,
      address: billingDetails.address,
      city: billingDetails.city,
      state: billingDetails.state,
      zipCode: billingDetails.zipCode,
      country: billingDetails.country
    };

    const order = new Order({
      user,
      items,
      subtotal,
      gst,
      discount,
      total,
      coupon,
      paymentIntentId,
      billingDetails,
      shippingDetails
    });

    await order.save();

    res.status(201).json(order);
  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Get order by ID
// Get all orders (admin)
exports.getAllOrders = async (req, res) => {
    try {
      const { status, search, page = 1, limit = 10 } = req.query;
      
      const query = {};
      
      // Status filter
      if (status && status !== 'all') {
        query.orderStatus = status;
      }
      
      // Search filter
      if (search) {
        query.$or = [
          { _id: search },
          { 'billingDetails.firstName': { $regex: search, $options: 'i' } },
          { 'billingDetails.lastName': { $regex: search, $options: 'i' } },
          { 'billingDetails.email': { $regex: search, $options: 'i' } }
        ];
      }
  
      const orders = await Order.find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(parseInt(limit))
        .populate('user', 'firstName lastName email');
  
      const total = await Order.countDocuments(query);
  
      res.json({
        orders,
        totalPages: Math.ceil(total / limit),
        currentPage: parseInt(page),
        totalOrders: total
      });
    } catch (error) {
      console.error('Error getting all orders:', error);
      res.status(500).json({ 
        error: 'Server error',
        message: error.message 
      });
    }
  };

// Get orders for a user
exports.getUserOrders = async (req, res) => {
  try {
    const orders = await Order.find({ user: req.params.userId })
      .sort({ createdAt: -1 })
      .populate('items.productId', 'name image');

    res.json(orders);
  } catch (error) {
    console.error('Error getting user orders:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Get order by ID
exports.getOrderById = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('user', 'firstName lastName email')
      .populate('items.productId', 'name image price');

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    res.json(order);
  } catch (error) {
    console.error('Error getting order by ID:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Update order status (admin)
exports.updateOrderStatus = async (req, res) => {
  try {
    const { status } = req.body;
    
    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { orderStatus: status },
      { new: true }
    ).populate('user', 'email');

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Send status update email to customer
    if (status === 'shipped' || status === 'delivered') {
      await sendOrderStatusUpdateEmail(order.user.email, order);
    }

    res.json(order);
  } catch (error) {
    console.error('Error updating order status:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Process payment success (called from webhook)
exports.processPaymentSuccess = async (paymentIntentId) => {
  try {
    const order = await Order.findOne({ paymentIntentId });
    
    if (!order) {
      console.error('Order not found for payment intent:', paymentIntentId);
      return;
    }

    order.paymentStatus = 'succeeded';
    await order.save();

    return order;
  } catch (error) {
    console.error('Error processing payment success:', error);
    throw error;
  }
};