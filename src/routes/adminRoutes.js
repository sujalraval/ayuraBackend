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
    refreshToken
} = require('../controllers/adminController');

const { adminAuth, authorize } = require('../middleware/adminAuth'); // ✅ FIXED: Destructure both

// Public routes
router.post('/login', adminLogin);
router.post('/create-super-admin', createSuperAdmin); // Remove in production
router.post('/refresh-token', refreshToken);

// Logout route (can be public)
router.post('/logout', (req, res) => {
    res.clearCookie('adminToken');
    res.json({
        success: true,
        message: 'Logged out successfully'
    });
});

// Protected routes
router.get('/profile', adminAuth, getAdminProfile);
router.put('/profile', adminAuth, updateAdmin); // ✅ FIXED: Should use updateAdmin for PUT

// Super admin only routes
router.get('/all', adminAuth, authorize('superadmin'), getAllAdmins);
router.post('/create', adminAuth, authorize('superadmin'), createAdmin);
router.put('/:id', adminAuth, updateAdmin);
router.delete('/:id', adminAuth, authorize('superadmin'), deleteAdmin);

module.exports = router;
