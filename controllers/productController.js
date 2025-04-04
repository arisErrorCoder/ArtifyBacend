const mongoose = require('mongoose');
const Product = require('../models/Product');
const ErrorResponse = require('../utils/errorResponse');
const asyncHandler = require('../middleware/async');
const path = require('path');
const fs = require('fs');




// @desc    Get all active products
// @route   GET /api/products
// @access  Public
exports.getActiveProducts = asyncHandler(async (req, res, next) => {
  const products = await Product.find({ status: 'active' });
  
  res.status(200).json({
    success: true,
    count: products.length,
    data: products
  });
});

// @desc    Get all products (admin only)
// @route   GET /api/products/all
// @access  Private/Admin
exports.getAllProducts = asyncHandler(async (req, res, next) => {
  const products = await Product.find();
  
  res.status(200).json({
    success: true,
    count: products.length,
    data: products
  });
});

// @desc    Get single product
// @route   GET /api/products/:id
// @access  Public
exports.getProduct = asyncHandler(async (req, res, next) => {
  // Validate if ID is a valid ObjectId
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return next(new ErrorResponse(`Invalid product ID format`, 400));
  }

  const product = await Product.findById(req.params.id);

  if (!product) {
    return next(
      new ErrorResponse(`Product not found with id of ${req.params.id}`, 404)
    );
  }

  res.status(200).json({
    success: true,
    data: product
  });
});

// @desc    Create new product
// @route   POST /api/products
// @access  Private/Admin
exports.createProduct = asyncHandler(async (req, res, next) => {
  // Process uploaded files
  const images = [];
  if (req.files) {
    req.files.forEach(file => {
      images.push({
        url: `/uploads/${filename}`,
        filename: file.filename,
        format: path.extname(file.originalname).substring(1).toLowerCase()
      });
    });
  }

  // Process form data
  const productData = {
    ...req.body,
    images
  };

  // Convert string values to arrays where needed
  if (typeof productData.clientNeedsToProvide === 'string') {
    productData.clientNeedsToProvide = productData.clientNeedsToProvide.split(',');
  }
  if (typeof productData.features === 'string') {
    productData.features = productData.features.split(',');
  }
  if (typeof productData.includes === 'string') {
    productData.includes = productData.includes.split(',');
  }
  if (typeof productData.excludes === 'string') {
    productData.excludes = productData.excludes.split(',');
  }

  // Convert numeric fields
  productData.price = parseFloat(productData.price);
  productData.originalPrice = parseFloat(productData.originalPrice || productData.price);
  productData.rating = parseFloat(productData.rating || 0);
  productData.reviewCount = parseInt(productData.reviewCount || 0);
  productData.revisions = parseInt(productData.revisions || 0);

  // Calculate discount if not provided
  if (!productData.discount && productData.price && productData.originalPrice) {
    const discount = Math.round((1 - productData.price / productData.originalPrice) * 100);
    productData.discount = `${discount}% OFF`;
  }

  const product = await Product.create(productData);

  res.status(201).json({
    success: true,
    data: product
  });
});

// @desc    Update product
// @route   PUT /api/products/:id
// @access  Private/Admin
exports.updateProduct = asyncHandler(async (req, res, next) => {
  let product = await Product.findById(req.params.id);

  if (!product) {
    return next(
      new ErrorResponse(`Product not found with id of ${req.params.id}`, 404)
    );
  }

  // Process new images if uploaded
  let images = [];
  if (req.files && req.files.length > 0) {
    // Add new images
    req.files.forEach(file => {
      images.push({
        url: `/uploads/${file.filename}`,
        filename: file.filename,
        format: path.extname(file.originalname).substring(1).toLowerCase()
      });
    });
  }

  // Keep existing images if provided
  if (req.body.existingImages) {
    const existingImages = Array.isArray(req.body.existingImages) 
      ? req.body.existingImages 
      : [req.body.existingImages];
    
    existingImages.forEach(url => {
      const existingImage = product.images.find(img => img.url === url);
      if (existingImage) {
        images.push(existingImage);
      }
    });
  }

  // Prepare update data
  const updateData = {
    ...req.body,
    images
  };

  // Convert string values to arrays where needed
  if (typeof updateData.clientNeedsToProvide === 'string') {
    updateData.clientNeedsToProvide = updateData.clientNeedsToProvide.split(',');
  }
  if (typeof updateData.features === 'string') {
    updateData.features = updateData.features.split(',');
  }
  if (typeof updateData.includes === 'string') {
    updateData.includes = updateData.includes.split(',');
  }
  if (typeof updateData.excludes === 'string') {
    updateData.excludes = updateData.excludes.split(',');
  }

  // Convert numeric fields
  if (updateData.price) updateData.price = parseFloat(updateData.price);
  if (updateData.originalPrice) updateData.originalPrice = parseFloat(updateData.originalPrice);
  if (updateData.rating) updateData.rating = parseFloat(updateData.rating);
  if (updateData.reviewCount) updateData.reviewCount = parseInt(updateData.reviewCount);
  if (updateData.revisions) updateData.revisions = parseInt(updateData.revisions);

  // Calculate discount if prices changed
  if (updateData.price && updateData.originalPrice) {
    const discount = Math.round((1 - updateData.price / updateData.originalPrice) * 100);
    updateData.discount = `${discount}% OFF`;
  }

  product = await Product.findByIdAndUpdate(req.params.id, updateData, {
    new: true,
    runValidators: true
  });

  res.status(200).json({
    success: true,
    data: product
  });
});

// @desc    Delete product
// @route   DELETE /api/products/:id
// @access  Private/Admin
exports.deleteProduct = asyncHandler(async (req, res, next) => {
  // Validate ObjectId format first
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return next(new ErrorResponse(`Invalid product ID format`, 400));
  }

  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return next(
        new ErrorResponse(`Product not found with id of ${req.params.id}`, 404)
      );
    }

    // Delete associated images
    product.images.forEach(image => {
      const filePath = path.join(__dirname, `../../public${image.url}`);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    });

    // Use deleteOne() instead of remove()
    await Product.deleteOne({ _id: req.params.id });

    res.status(200).json({
      success: true,
      data: {}
    });

  } catch (error) {
    console.error('Delete error:', error);
    return next(
      new ErrorResponse(`Error deleting product: ${error.message}`, 500)
    );
  }
});

// @desc    Toggle product status (active/inactive)
// @route   PATCH /api/products/:id/status
// @access  Private/Admin
exports.toggleProductStatus = asyncHandler(async (req, res, next) => {
  const product = await Product.findById(req.params.id);

  if (!product) {
    return next(
      new ErrorResponse(`Product not found with id of ${req.params.id}`, 404)
    );
  }

  // Toggle status
  product.status = product.status === 'active' ? 'inactive' : 'active';
  await product.save();

  res.status(200).json({
    success: true,
    data: product
  });
});