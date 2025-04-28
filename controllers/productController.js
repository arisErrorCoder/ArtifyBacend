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
        url: `/uploads/${file.filename}`,  // Changed from filename to file.filename
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

// @desc      Bulk upload products
// @route     POST /api/v1/products/bulk
// @access    Private/Admin
exports.bulkUploadProducts = asyncHandler(async (req, res, next) => {
  const { products } = req.body;

  // Validate input
  if (!products || !Array.isArray(products)) {
    return next(new ErrorResponse('Please provide an array of products', 400));
  }

  if (products.length === 0) {
    return next(new ErrorResponse('Products array cannot be empty', 400));
  }

  if (products.length > 100) {
    return next(new ErrorResponse('Cannot upload more than 100 products at once', 400));
  }

  try {
    // Validate each product
    const validatedProducts = [];
    const errors = [];

    await Promise.all(products.map(async (product, index) => {
      // Basic validation
      if (!product.name || !product.category) {
        errors.push(`Product at index ${index} is missing required fields (name or category)`);
        return;
      }

      // Check for duplicate names in this batch
      const duplicateInBatch = validatedProducts.some(p => p.name === product.name);
      if (duplicateInBatch) {
        errors.push(`Duplicate product name found in batch: ${product.name}`);
        return;
      }

      // Check if product already exists in database
      const existingProduct = await Product.findOne({ name: product.name });
      if (existingProduct) {
        errors.push(`Product already exists: ${product.name}`);
        return;
      }

      // Set default values
      const newProduct = {
        name: product.name,
        images: product.images || [],
        price: product.price || 0,
        originalPrice: product.originalPrice || product.price || 0,
        discount: product.discount || '',
        category: product.category,
        subcategory: product.subcategory || '',
        rating: product.rating || 0,
        reviewCount: product.reviewCount || 0,
        size: product.size || '',
        revisions: product.revisions || 0,
        deliveryTime: product.deliveryTime || '',
        quantityUnit: product.quantityUnit || '',
        description: product.description || '',
        clientNeedsToProvide: product.clientNeedsToProvide || [],
        features: product.features || [],
        includes: product.includes || [],
        excludes: product.excludes || [],
        status: product.status || 'active',
        createdAt: product.createdAt || Date.now()
      };

      validatedProducts.push(newProduct);
    }));

    if (errors.length > 0) {
      return next(new ErrorResponse(`Validation errors: ${errors.join('; ')}`, 400));
    }

    if (validatedProducts.length === 0) {
      return next(new ErrorResponse('No valid products to upload', 400));
    }

    // Insert products
    const result = await Product.insertMany(validatedProducts, { ordered: false });

    res.status(201).json({
      success: true,
      data: {
        insertedCount: result.length,
        products: result
      }
    });

  } catch (error) {
    console.error('Bulk upload error:', error);

    // Handle specific MongoDB errors
    if (error.name === 'BulkWriteError') {
      const writeErrors = error.writeErrors || [];
      const errorMessages = writeErrors.map(err => {
        return `Product ${err.op.name}: ${err.errmsg}`;
      });

      return next(new ErrorResponse(
        `Partial success. Some products failed to upload: ${errorMessages.join('; ')}`,
        207 // Multi-status
      ));
    }

    return next(new ErrorResponse(
      `Error during bulk upload: ${error.message}`,
      500
    ));
  }
});