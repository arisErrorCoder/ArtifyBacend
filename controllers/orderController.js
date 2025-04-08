const Order = require('../models/Order');
const { sendOrderConfirmationEmail, sendOrderStatusUpdateEmail } = require('../services/emailService');
const mongoose = require('mongoose');

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
  const orderId = req.params.id;

    // ✅ Check if the ID is a valid Mongo ObjectId
    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      return res.status(400).json({ error: 'Invalid order ID format' });
    }
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



// @desc    Get dashboard statistics
// @route   GET /api/orders/dashboard-stats
exports.getDashboardStats = async (req, res) => {
  try {
    // Calculate date ranges for comparison
    const currentDate = new Date();
    const currentMonthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const prevMonthStart = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
    const prevMonthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth(), 0);
    
    // Get total revenue
    const totalRevenueResult = await Order.aggregate([
      { $match: { paymentStatus: 'succeeded' } },
      { $group: { _id: null, total: { $sum: '$total' } } }
    ]);
    const totalRevenue = totalRevenueResult[0]?.total || 0;
    
    // Get current month revenue
    const currentMonthRevenueResult = await Order.aggregate([
      { 
        $match: { 
          paymentStatus: 'succeeded',
          createdAt: { $gte: currentMonthStart }
        } 
      },
      { $group: { _id: null, total: { $sum: '$total' } } }
    ]);
    const currentMonthRevenue = currentMonthRevenueResult[0]?.total || 0;
    
    // Get previous month revenue
    const prevMonthRevenueResult = await Order.aggregate([
      { 
        $match: { 
          paymentStatus: 'succeeded',
          createdAt: { $gte: prevMonthStart, $lte: prevMonthEnd }
        } 
      },
      { $group: { _id: null, total: { $sum: '$total' } } }
    ]);
    const prevMonthRevenue = prevMonthRevenueResult[0]?.total || 0;
    
    // Calculate revenue change percentage
    const revenueChange = prevMonthRevenue > 0 
      ? Math.round(((currentMonthRevenue - prevMonthRevenue) / prevMonthRevenue) * 100)
      : currentMonthRevenue > 0 ? 100 : 0;
    
    // Get order counts
    const totalOrders = await Order.countDocuments();
    const currentMonthOrders = await Order.countDocuments({ createdAt: { $gte: currentMonthStart } });
    const prevMonthOrders = await Order.countDocuments({ 
      createdAt: { $gte: prevMonthStart, $lte: prevMonthEnd } 
    });
    
    // Calculate orders change percentage
    const ordersChange = prevMonthOrders > 0 
    ? Math.round(((currentMonthOrders - prevMonthOrders) / prevMonthOrders * 100))
    : currentMonthOrders > 0 ? 100 : 0;
    
    // Get customer counts
    const totalCustomers = await User.countDocuments();
    const newCustomersThisMonth = await User.countDocuments({ 
      createdAt: { $gte: currentMonthStart } 
    });
    const newCustomersLastMonth = await User.countDocuments({ 
      createdAt: { $gte: prevMonthStart, $lte: prevMonthEnd } 
    });
    
    // Calculate customers change percentage
    const customersChange = newCustomersLastMonth > 0 
    ? Math.round(((newCustomersThisMonth - newCustomersLastMonth) / newCustomersLastMonth * 100))
    : newCustomersThisMonth > 0 ? 100 : 0;
    
    res.json({
      success: true,
      data: {
        totalRevenue,
        currentMonthRevenue,
        prevMonthRevenue,
        revenueChange,
        totalOrders,
        newOrders: currentMonthOrders,
        ordersChange,
        totalCustomers,
        newCustomers: newCustomersThisMonth,
        customersChange
      }
    });
  } catch (error) {
    console.error('Error getting dashboard stats:', error);
    res.status(500).json({ 
      success: false,
      error: 'Server error',
      message: error.message 
    });
  }
};