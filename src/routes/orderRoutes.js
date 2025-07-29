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
    getFamilyMembers,
    getAdminReports // Make sure this is imported
} = require('../controllers/orderController');
const { adminAuth, authorize } = require('../middleware/adminAuth');
const { protect } = require('../middleware/auth');

// Admin routes (put specific routes BEFORE parameterized ones)
router.get('/pending', adminAuth, authorize('admin', 'superadmin'), getPendingOrders);
router.get('/all', adminAuth, authorize('admin', 'superadmin'), getAllOrders);
router.get('/working', adminAuth, authorize('admin', 'superadmin', 'labtech'), getWorkingOrders);
router.get('/reports', adminAuth, authorize('admin', 'superadmin', 'labtech'), getAdminReports); // ← IMPORTANT: Before /:id
router.put('/approve/:orderId', adminAuth, authorize('admin', 'superadmin'), approveOrder);
router.put('/deny/:orderId', adminAuth, authorize('admin', 'superadmin'), denyOrder);
router.put('/:id/status', adminAuth, updateOrderStatus);

// Report upload
router.post(
    '/upload-report/:id',
    adminAuth,
    upload.single('report'),
    uploadReport
);

// User routes
router.post('/place', protect, placeOrder);
router.get('/user', protect, getUserOrders);
router.get('/family-members', protect, getFamilyMembers);
router.put('/:id/cancel', protect, cancelOrder);

// Shared route (MUST be last among parameterized routes)
router.get('/:id', (req, res, next) => {
    if (req.cookies?.adminToken || req.headers?.authorization?.startsWith('Bearer ')) {
        return adminAuth(req, res, next);
    }
    return protect(req, res, next);
}, getOrderById);

module.exports = router;
