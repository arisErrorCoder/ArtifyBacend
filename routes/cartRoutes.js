const express = require('express');
const router = express.Router();
const { protect } = require('../config/jwt');
const cartController = require('../controllers/cartController');
const upload = require('../middleware/cartupload');

router.use(protect);

router.get('/', cartController.getCart);
router.post('/', upload.array('files'), cartController.addToCart);
router.delete('/:productId', cartController.removeCartItem);
router.delete('/', cartController.clearCart);

module.exports = router;