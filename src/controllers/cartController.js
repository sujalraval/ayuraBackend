const Cart = require('../models/Cart');
const Order = require('../models/Order');

// 📦 Get Cart by User ID
exports.getCart = async (req, res) => {
    try {
        const { userId } = req.params;

        if (!userId) {
            return res.status(400).json({ error: 'User ID is required' });
        }

        const cart = await Cart.findOne({ userId });
        res.status(200).json(cart || { userId, items: [] });
    } catch (err) {
        console.error('Get cart error:', err);
        res.status(500).json({ error: err.message });
    }
};

// ➕ Add Test to Cart
exports.addToCart = async (req, res) => {
    try {
        const { userId, test } = req.body;

        if (!userId || !test || !test._id || !test.name || !test.price) {
            return res.status(400).json({ error: 'Missing test or user data' });
        }

        let cart = await Cart.findOne({ userId });
        if (!cart) {
            cart = new Cart({ userId, items: [] });
        }

        const existingItemIndex = cart.items.findIndex(item => item.testId.toString() === test._id);
        if (existingItemIndex !== -1) {
            cart.items[existingItemIndex].quantity += 1;
        } else {
            cart.items.push({
                testId: test._id,
                name: test.name,
                price: test.price,
                description: test.description || '',
                category: test.category || '',
                quantity: 1,
                _id: test._id // Store the original test ID for reference
            });
        }

        await cart.save();
        res.status(200).json(cart);
    } catch (err) {
        console.error('Add to cart error:', err);
        res.status(500).json({ error: err.message });
    }
};

// ❌ Remove Item from Cart (FIXED - Using URL parameters correctly)
exports.removeFromCart = async (req, res) => {
    try {
        const { userId, testId } = req.params;

        console.log('Remove request - UserId:', userId, 'TestId:', testId); // Debug log

        if (!userId || !testId) {
            return res.status(400).json({
                error: 'User ID and Test ID are required',
                received: { userId, testId }
            });
        }

        const cart = await Cart.findOne({ userId });
        if (!cart) {
            return res.status(404).json({ error: 'Cart not found for user' });
        }

        const initialLength = cart.items.length;
        console.log('Items before removal:', cart.items.length);

        // Remove item by testId (compare both testId and _id fields)
        cart.items = cart.items.filter(item => {
            const itemTestId = item.testId ? item.testId.toString() : '';
            const itemId = item._id ? item._id.toString() : '';
            return itemTestId !== testId && itemId !== testId;
        });

        console.log('Items after removal:', cart.items.length);

        if (cart.items.length === initialLength) {
            return res.status(404).json({
                error: 'Item not found in cart',
                searchedId: testId,
                availableItems: cart.items.map(item => ({
                    testId: item.testId,
                    _id: item._id,
                    name: item.name
                }))
            });
        }

        await cart.save();
        res.status(200).json({
            message: 'Item removed successfully',
            cart: cart
        });
    } catch (err) {
        console.error('Remove from cart error:', err);
        res.status(500).json({ error: err.message });
    }
};

// 📝 Update Cart Item Quantity
exports.updateCartItem = async (req, res) => {
    try {
        const { userId, testId } = req.params;
        const { quantity } = req.body;

        if (!userId || !testId || quantity === undefined) {
            return res.status(400).json({ error: 'Missing required parameters' });
        }

        if (quantity < 1) {
            return res.status(400).json({ error: 'Quantity must be at least 1' });
        }

        const cart = await Cart.findOne({ userId });
        if (!cart) {
            return res.status(404).json({ error: 'Cart not found' });
        }

        const itemIndex = cart.items.findIndex(item => {
            const itemTestId = item.testId ? item.testId.toString() : '';
            const itemId = item._id ? item._id.toString() : '';
            return itemTestId === testId || itemId === testId;
        });

        if (itemIndex === -1) {
            return res.status(404).json({ error: 'Item not found in cart' });
        }

        cart.items[itemIndex].quantity = quantity;
        await cart.save();

        res.status(200).json(cart);
    } catch (err) {
        console.error('Update cart item error:', err);
        res.status(500).json({ error: err.message });
    }
};

// 🧹 Clear Entire Cart
exports.clearCart = async (req, res) => {
    try {
        const { userId } = req.params;

        if (!userId) {
            return res.status(400).json({ error: 'User ID is required' });
        }

        await Cart.findOneAndDelete({ userId });
        res.status(200).json({ message: 'Cart cleared successfully' });
    } catch (err) {
        console.error('Clear cart error:', err);
        res.status(500).json({ error: err.message });
    }
};

// 🧾 Place New Order
exports.placeOrder = async (req, res) => {
    try {
        const { patientInfo, cartItems, totalPrice } = req.body;

        if (!patientInfo || !cartItems?.length || !totalPrice) {
            return res.status(400).json({ message: 'Missing required order fields' });
        }

        const newOrder = new Order({
            ...req.body,
            orderDate: new Date(),
            status: 'pending'
        });

        await newOrder.save();

        // Clear the cart after placing order
        if (patientInfo?.email) {
            await Cart.findOneAndDelete({ userId: patientInfo.email });
        }

        res.status(201).json({ message: 'Order placed successfully', order: newOrder });
    } catch (error) {
        console.error('Place order error:', error);
        res.status(500).json({ message: 'Failed to place order', error: error.message });
    }
};

// 📚 Get All Orders (Admin use)
exports.getAllOrders = async (req, res) => {
    try {
        const orders = await Order.find().sort({ createdAt: -1 });
        res.json(orders);
    } catch (error) {
        console.error('Get orders error:', error);
        res.status(500).json({ message: 'Error fetching orders' });
    }
};
