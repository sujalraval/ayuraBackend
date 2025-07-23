const express = require('express');
const router = express.Router();
const adminAuth = require('../middleware/adminAuth');
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

// Public routes (no authentication required)
router.post('/login', adminLogin);
router.post('/create-super-admin', createSuperAdmin); // One-time use for initial setup
router.post('/refresh-token', refreshToken);

// Protected routes (authentication required)
router.use(adminAuth); // Apply middleware to all routes below

// Admin profile routes
router.get('/profile', getAdminProfile);
router.put('/profile', getAdminProfile); // For profile updates

// Admin management routes (super admin only)
router.get('/all', getAllAdmins);
router.post('/create', createAdmin);
router.put('/:id', updateAdmin);
router.delete('/:id', deleteAdmin);

// Logout route
router.post('/logout', (req, res) => {
    // Clear cookies if using cookie-based auth
    res.clearCookie('adminToken');
    res.json({
        success: true,
        message: 'Logged out successfully'
    });
});

module.exports = router;