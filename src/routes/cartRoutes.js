const express = require('express');
const router = express.Router();
const cartController = require('../controllers/cartController');

// GET /api/v1/cart/:userId - Get cart by user ID
router.get('/:userId', cartController.getCart);

// POST /api/v1/cart/add - Add item to cart
router.post('/add', cartController.addToCart);

// DELETE /api/v1/cart/remove/:userId/:testId - Remove specific item from cart
router.delete('/remove/:userId/:testId', cartController.removeFromCart);

// PUT /api/v1/cart/update/:userId/:testId - Update item quantity
router.put('/update/:userId/:testId', cartController.updateCartItem);

// DELETE /api/v1/cart/clear/:userId - Clear entire cart
router.delete('/clear/:userId', cartController.clearCart);

// POST /api/v1/cart/place-order - Place new order
router.post('/place-order', cartController.placeOrder);

// GET /api/v1/cart/orders - Get all orders (Admin only)
router.get('/orders', cartController.getAllOrders);

module.exports = router;
