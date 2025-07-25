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
    adminLogout
} = require('../controllers/adminController');

const { adminAuth, authorize } = require('../middleware/adminAuth');

// Public routes
router.post('/login', adminLogin);
router.post('/create-super-admin', createSuperAdmin); // Remove in production
router.post('/refresh-token', refreshToken);
router.post('/logout', adminLogout);

// Protected routes
router.get('/profile', adminAuth, getAdminProfile);
router.put('/profile', adminAuth, updateAdmin);

// Super admin only routes
router.get('/all', adminAuth, authorize('superadmin'), getAllAdmins);
router.post('/create', adminAuth, authorize('superadmin'), createAdmin);
router.put('/:id', adminAuth, authorize('superadmin'), updateAdmin);
router.delete('/:id', adminAuth, authorize('superadmin'), deleteAdmin);

module.exports = router;