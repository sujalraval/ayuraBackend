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
router.post('/create-super-admin', createSuperAdmin);
router.post('/refresh-token', refreshToken);

// Logout route (can be public)
router.post('/logout', (req, res) => {
    res.clearCookie('adminToken');
    res.json({
        success: true,
        message: 'Logged out successfully'
    });
});

// Protected routes (authentication required)
router.get('/profile', adminAuth, getAdminProfile);
router.put('/profile', adminAuth, getAdminProfile); // Apply auth individually
router.get('/all', adminAuth, getAllAdmins);
router.post('/create', adminAuth, createAdmin);
router.put('/:id', adminAuth, updateAdmin);
router.delete('/:id', adminAuth, deleteAdmin);

module.exports = router;
