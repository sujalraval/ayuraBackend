const express = require('express');
const router = express.Router();
const upload = require('../config/multerConfig'); // Use consistent naming with other routes

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
const { adminAuth } = require('../middleware/adminAuth'); // ✅ FIXED: Destructure adminAuth

// ✅ IMPORTANT: Specific routes MUST come before generic ones

// Admin Routes - Use adminAuth middleware for admin-only routes
router.get('/pending', adminAuth, getPendingOrders);
router.get('/all', adminAuth, getAllOrders);
router.get('/working', adminAuth, getWorkingOrders);
router.put('/approve/:orderId', adminAuth, approveOrder);
router.put('/deny/:orderId', adminAuth, denyOrder);

// File upload route with enhanced error handling
router.post('/upload-report/:id',
    adminAuth,
    (req, res, next) => {
        // Add custom error handling for multer
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

// Optional: Add debug route for file verification (remove in production)
if (process.env.NODE_ENV === 'development') {
    router.get('/debug/report/:filename', adminAuth, (req, res) => {
        const { getFilePath, verifyFileExists } = require('../utils/fileUtils');
        const filePath = getFilePath(req.params.filename, 'reports');

        res.json({
            filename: req.params.filename,
            path: filePath,
            exists: verifyFileExists(filePath),
            url: `${req.protocol}://${req.get('host')}/uploads/reports/${req.params.filename}`
        });
    });
}

module.exports = router;
