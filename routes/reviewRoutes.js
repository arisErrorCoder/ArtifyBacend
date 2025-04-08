const express = require('express');
const multer = require('multer');
const router = express.Router();
const Review = require('../models/Review');
const Product = require('../models/Product');
const { protect } = require('../middleware/auth');

// Setup multer storage (can be customized)
const storage = multer.diskStorage({
  destination: './public/uploads/products/',
  filename: function(req, file, cb) {
    cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
  }
});const upload = multer({ storage });

router.post('/', protect, upload.any(), async (req, res) => {
    try {
      // Get fields from form-data
      const { productId, rating, comment, name } = req.body;
      
      // Validate required fields
      if (!productId || !rating || !comment || !name) {
        return res.status(400).json({ error: 'Missing required fields' });
      }
  
      // Check if product exists
      const product = await Product.findById(productId);
      if (!product) {
        return res.status(404).json({ error: 'Product not found' });
      }
      
      // Check for existing review
      const existingReview = await Review.findOne({
        product: productId,
        user: req.user._id
      });
      
      if (existingReview) {
        return res.status(400).json({ error: 'You have already reviewed this product' });
      }
      
      // Process images if any
      let images = [];
      if (req.files && req.files.length > 0) {
        images = req.files.map(file => ({
          url: file.path || `data:${file.mimetype};base64,${file.buffer.toString('base64')}`,
          filename: file.originalname
        }));
      }
      
      const review = new Review({
        product: productId,
        user: req.user._id,
        name: name, // Use the name from the form data
        rating,
        comment,
        images
      });
      
      await review.save();
      
      // Update product rating
      const reviews = await Review.find({ product: productId });
      const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
      const averageRating = totalRating / reviews.length;
      
      await Product.findByIdAndUpdate(productId, {
        rating: averageRating,
        reviewCount: reviews.length
      });
      
      res.status(201).json(review);
    } catch (error) {
      console.error('Review creation error:', error);
      res.status(500).json({ error: error.message });
    }
  });


// Get reviews for a product
router.get('/product/:productId', async (req, res) => {
  try {
    const reviews = await Review.find({ product: req.params.productId })
      .sort({ createdAt: -1 });
    
    res.json(reviews);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;