const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');


router.post('/', orderController.createOrder);
router.get('/:id', orderController.getOrderById);
router.get('/user-orders/:userId', orderController.getUserOrders);
router.get('/', orderController.getAllOrders);
router.put('/update-status/:id', orderController.updateOrderStatus);

module.exports = router;