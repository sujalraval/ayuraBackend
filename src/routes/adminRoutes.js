const express = require('express');
const router = express.Router();

const {
    adminLogin,
    createSuperAdmin,
    getAdminProfile,
    getAllAdmins,
    createAdmin,
    updateAdmin,
    deleteAdmin,
    refreshToken,
    adminLogout,
    verifyAdmin
} = require('../controllers/adminController');

const { adminAuth, authorize, isSuperAdmin } = require('../middleware/adminAuth');

// Debug route to check if admin routes are working
router.get('/test', (req, res) => {
    res.json({
        success: true,
        message: 'Admin routes are working',
        timestamp: new Date().toISOString()
    });
});

// Public routes (no authentication required)
router.post('/login', adminLogin);
router.post('/refresh-token', refreshToken);
router.post('/logout', adminLogout);

// Super admin creation route (should be disabled in production)
router.post('/create-super-admin', createSuperAdmin);

// Protected routes (require admin authentication)
router.get('/verify', adminAuth, verifyAdmin);
router.get('/profile', adminAuth, getAdminProfile);
router.put('/profile', adminAuth, updateAdmin);

// Super admin only routes
router.get('/all', adminAuth, isSuperAdmin, getAllAdmins);
router.post('/create', adminAuth, isSuperAdmin, createAdmin);
router.put('/:id', adminAuth, authorize('superadmin'), updateAdmin);
router.delete('/:id', adminAuth, authorize('superadmin'), deleteAdmin);

// Export router
module.exports = router;
