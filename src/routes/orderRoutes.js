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
const { protect } = require('../middleware/auth');
const { adminAuth } = require('../middleware/adminAuth');

// Admin Routes - Use adminAuth middleware
router.get('/pending', adminAuth, getPendingOrders);
router.get('/all', adminAuth, getAllOrders);
router.get('/working', adminAuth, getWorkingOrders);
router.put('/approve/:orderId', adminAuth, approveOrder);
router.put('/deny/:orderId', adminAuth, denyOrder);
router.put('/:id/status', adminAuth, updateOrderStatus);

// File upload route
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

// Mixed Routes - Try admin first, then user
router.get('/:id', (req, res, next) => {
    // Check if it's an admin request first
    const token = req.headers.authorization?.split(' ')[1] || req.headers.authorization;
    const isAdminToken = token && localStorage?.getItem('adminToken') === token;

    if (isAdminToken) {
        return adminAuth(req, res, next);
    } else {
        return protect(req, res, next);
    }
}, getOrderById);

// // Debug route for development
// if (process.env.NODE_ENV === 'development') {
//     router.get('/debug/report/:filename', adminAuth, (req, res) => {
//         const { getFilePath, verifyFileExists } = require('../utils/fileUtils');
//         const filePath = getFilePath(req.params.filename, 'reports');
//         res.json({
//             filename: req.params.filename,
//             path: filePath,
//             exists: verifyFileExists(filePath),
//             url: `${req.protocol}://${req.get('host')}/uploads/reports/${req.params.filename}`
//         });
//     });
// }

module.exports = router;
