const mongoose = require('mongoose');
const Cart = require('../models/Cart');
const Product = require('../models/Product');
const { NotFoundError, BadRequestError } = require('../middleware/error');

exports.addToCart = async (req, res, next) => {
  try {
    const { productId ,quantity } = req.body;
    
    // Validate product ID
    if (!mongoose.Types.ObjectId.isValid(productId)) {
      throw new BadRequestError('Invalid product ID format');
    }

    // Verify product exists
    const product = await Product.findById(productId);
    if (!product) {
      throw new NotFoundError('Product not found');
    }

    // Find user's cart or create new one
    let cart = await Cart.findOne({ user: req.user._id }) || 
               new Cart({ user: req.user._id, items: [], total: 0 });

    // Check if product already exists in cart
    const existingItemIndex = cart.items.findIndex(
      item => item.product.toString() === productId
    );

    if (existingItemIndex > -1) {
      return res.status(400).json({
        success: false,
        message: 'Product already in cart',
        inCart: true
      });
    }

    // Process files if any
    const processedFiles = [];
    if (req.files?.length > 0) {
      req.files.forEach(file => {
        processedFiles.push({
          name: file.originalname,
          url: `/uploads-cart/${file.filename}`,
          path: file.path
        });
      });
    }

    // Parse clientInfo
    let clientInfo = {};
    try {
      clientInfo = req.body.clientInfo ? JSON.parse(req.body.clientInfo) : {};
    } catch (e) {
      throw new BadRequestError('Invalid client information format');
    }

    // Add new item to cart
    cart.items.push({
      product: productId,
      quantity: quantity, // Default quantity
      price: product.price,
      clientInfo: {
        name: clientInfo.name || '',
        phone: clientInfo.phone || '',
        gst: clientInfo.gst || '',
        driveLink: clientInfo.driveLink || '',
        files: processedFiles
      }
    });

    // Recalculate total
    cart.total = cart.items.reduce(
      (total, item) => total + (item.price * item.quantity),
      0
    );

    await cart.save();
    await cart.populate('items.product', 'name price images');

    res.status(200).json({
      success: true,
      message: 'Product added to cart',
      cart
    });

  } catch (err) {
    next(err);
  }
};


// Get user's cart
exports.getCart = async (req, res, next) => {
  try {
    const cart = await Cart.findOne({ user: req.user._id })
      .populate('items.product', 'name price images deliveryTime');
    
    if (!cart) {
      return res.status(200).json({ items: [], total: 0 });
    }
    
    // Format the response to include all necessary product details
    const formattedItems = cart.items.map(item => ({
      productId: item.product._id,
      name: item.product.name,
      price: item.product.price,
      quantity: item.quantity,
      image: item.product.images[0]?.url || '',
      delivery: item.product.deliveryTime,
      clientInfo: item.clientInfo
    }));
    
    res.json({
      items: formattedItems,
      total: cart.total
    });
  } catch (err) {
    next(err);
  }
};


// Remove item from cart
exports.removeCartItem = async (req, res, next) => {
  try {
    const { productId } = req.params; // Changed from itemId to productId
    
    const cart = await Cart.findOne({ user: req.user._id });
    if (!cart) {
      throw new NotFoundError('Cart not found');
    }
    
    // Filter out the item with matching product ID
    cart.items = cart.items.filter(
      item => item.product.toString() !== productId
    );
    
    // Recalculate total
    cart.total = cart.items.reduce(
      (total, item) => total + (item.price * item.quantity),
      0
    );
    
    await cart.save();
    
    // Populate product details before sending response
    await cart.populate('items.product', 'name price images');
    
    res.json({
      success: true,
      message: 'Item removed from cart',
      cart
    });
  } catch (err) {
    next(err);
  }
};

// Clear cart
exports.clearCart = async (req, res, next) => {
  try {
    const cart = await Cart.findOneAndUpdate(
      { user: req.user._id },
      { $set: { items: [], total: 0 } },
      { new: true }
    );
    
    res.json(cart);
  } catch (err) {
    next(err);
  }
};