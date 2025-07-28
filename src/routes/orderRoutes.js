const express = require('express');
const router = express.Router();
const upload = require('../config/multerConfig');

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

const { protect } = require('../middleware/auth'); // User auth
const { adminAuth, isAdmin } = require('../middleware/adminAuth'); // Admin auth

// Debug route
router.get('/test', (req, res) => {
    res.json({
        success: true,
        message: 'Order routes are working',
        timestamp: new Date().toISOString()
    });
});

// Admin Routes - Use adminAuth middleware
router.get('/pending', adminAuth, getPendingOrders);
router.get('/all', adminAuth, getAllOrders);
router.get('/working', adminAuth, getWorkingOrders);
router.put('/approve/:orderId', adminAuth, approveOrder);
router.put('/deny/:orderId', adminAuth, denyOrder);
router.put('/:id/status', adminAuth, updateOrderStatus);

// File upload route for reports
router.post('/upload-report/:id',
    adminAuth,
    (req, res, next) => {
        upload.single('report')(req, res, (err) => {
            if (err) {
                console.error('Multer error:', err);
                if (err.code === 'LIMIT_FILE_SIZE') {
                    return res.status(400).json({
                        success: false,
                        error: 'File too large. Maximum size is 10MB.'
                    });
                }

                if (err.message.includes('Only JPEG, JPG, PNG images and PDF files are allowed')) {
                    return res.status(400).json({
                        success: false,
                        error: 'Invalid file type. Only JPEG, JPG, PNG, and PDF files are allowed.'
                    });
                }

                return res.status(400).json({
                    success: false,
                    error: err.message || 'File upload failed'
                });
            }
            next();
        });
    },
    uploadReport
);

// User Routes - Use protect middleware
router.post('/place', protect, placeOrder);
router.get('/user', protect, getUserOrders);
router.get('/family-members', protect, getFamilyMembers);
router.put('/:id/cancel', protect, cancelOrder);

// Mixed Routes - Can be accessed by both admin and users
router.get('/:id', (req, res, next) => {
    // Check if request has admin authorization first
    const authHeader = req.headers.authorization;
    const hasAdminAuth = authHeader && authHeader.startsWith('Bearer ');
    const hasAdminCookie = req.cookies && req.cookies.adminToken;

    if (hasAdminAuth || hasAdminCookie) {
        // Try admin auth first
        adminAuth(req, res, (err) => {
            if (err || !req.admin) {
                // If admin auth fails, try user auth
                protect(req, res, next);
            } else {
                // Admin auth successful
                next();
            }
        });
    } else {
        // No admin auth indicators, use user auth
        protect(req, res, next);
    }
}, getOrderById);

module.exports = router;
