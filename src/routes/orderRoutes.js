const express = require('express');
const router = express.Router();
const multerConfig = require('../config/multerConfig');

const {
    placeOrder,
    getPendingOrders,
    getAllOrders,
    approveOrder,
    denyOrder,
    getWorkingOrders,
    uploadReport,
    getUserOrders,
    getOrderById,
    updateOrderStatus,
    cancelOrder,
    getFamilyMembers
} = require('../controllers/orderController');

const { protect, authorize } = require('../middleware/auth'); // For regular users
const adminAuth = require('../middleware/adminAuth'); // For admin users

// ✅ IMPORTANT: Specific routes MUST come before generic ones

// Admin Routes - Use adminAuth middleware for admin-only routes
router.get('/pending', adminAuth, getPendingOrders);
router.get('/all', adminAuth, getAllOrders);
router.get('/working', adminAuth, getWorkingOrders);
router.put('/approve/:orderId', adminAuth, approveOrder);
router.put('/deny/:orderId', adminAuth, denyOrder);
router.post('/upload-report/:id',
    adminAuth,
    multerConfig.single('report'),
    uploadReport
);
router.put('/:id/status', adminAuth, updateOrderStatus);

// User Routes - Use regular protect middleware for user routes
router.post('/place', protect, placeOrder);
router.get('/user', protect, getUserOrders);
router.get('/family-members', protect, getFamilyMembers);
router.put('/:id/cancel', protect, cancelOrder);

// Mixed Routes - Can be accessed by both users and admins
router.get('/:id', (req, res, next) => {
    // Try admin auth first, then user auth
    adminAuth(req, res, (adminErr) => {
        if (!adminErr) {
            // Admin authenticated successfully
            return next();
        }

        // Try user authentication
        protect(req, res, (userErr) => {
            if (userErr) {
                return res.status(401).json({
                    success: false,
                    message: 'Authentication required'
                });
            }
            next();
        });
    });
}, getOrderById);

module.exports = router;