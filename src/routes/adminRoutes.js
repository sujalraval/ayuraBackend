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

const { adminAuth, authorize } = require('../middleware/adminAuth');

// Add CORS headers specifically for admin routes
router.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', req.headers.origin);
    res.header('Access-Control-Allow-Credentials', 'true');
    next();
});

// Public routes
router.post('/login', (req, res, next) => {
    console.log('Admin login attempt from:', req.headers.origin);
    next();
}, adminLogin);

router.post('/create-super-admin', createSuperAdmin); // Remove in production
router.post('/refresh-token', refreshToken);

// Logout route
router.post('/logout', (req, res) => {
    // Clear multiple possible cookie names
    res.clearCookie('adminToken');
    res.clearCookie('ayuras.sid');

    res.json({
        success: true,
        message: 'Logged out successfully'
    });
});

// Protected routes
router.get('/profile', adminAuth, getAdminProfile);
router.put('/profile', adminAuth, updateAdmin);

// Super admin only routes
router.get('/all', adminAuth, authorize('superadmin'), getAllAdmins);
router.post('/create', adminAuth, authorize('superadmin'), createAdmin);
router.put('/:id', adminAuth, authorize('superadmin'), updateAdmin);
router.delete('/:id', adminAuth, authorize('superadmin'), deleteAdmin);

module.exports = router;
