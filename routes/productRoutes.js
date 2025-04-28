const express = require('express');
const router = express.Router();
const upload = require('../middleware/upload');
const {
  getActiveProducts,
  getAllProducts,
  getProduct,
  createProduct,
  bulkUploadProducts,
  updateProduct,
  deleteProduct,
  toggleProductStatus
} = require('../controllers/productController');

// Public routes
router.route('/')
  .get(getActiveProducts);

// Specific route for /all BEFORE the /:id route
router.route('/all')
  .get(getAllProducts);

// This will now only catch actual IDs
router.route('/:id')
  .get(getProduct)
  .put(upload.array('images', 5), updateProduct)
  .delete(deleteProduct);

// Admin routes
router.route('/')
  .post(upload.array('images', 5), createProduct);

router.route('/:id/status')
  .patch(toggleProductStatus);

  router.post(
    '/bulk',
     bulkUploadProducts
  );
module.exports = router;