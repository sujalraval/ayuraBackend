const express = require('express');
const router = express.Router();

// Import controllers
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

// Import middleware
const authMiddleware = require('../middleware/adminAuth');

// Debug middleware imports
console.log('Middleware imports:', authMiddleware);

// Debug route
router.get('/test', (req, res) => {
    res.json({ message: 'Admin routes working' });
});

// Public routes
router.post('/login', adminLogin);
router.post('/refresh-token', refreshToken);
router.post('/logout', adminLogout);

// Super admin creation
router.post('/create-super-admin', createSuperAdmin);

// Protected routes
router.get('/verify', authMiddleware.adminAuth, verifyAdmin);
router.get('/profile', authMiddleware.adminAuth, getAdminProfile);
router.put('/profile', authMiddleware.adminAuth, updateAdmin);

// Super admin only routes
router.get('/all', authMiddleware.adminAuth, authMiddleware.isSuperAdmin, getAllAdmins);
router.post('/create', authMiddleware.adminAuth, authMiddleware.isSuperAdmin, createAdmin);
router.put('/:id', authMiddleware.adminAuth, authMiddleware.authorize('superadmin'), updateAdmin);
router.delete('/:id', authMiddleware.adminAuth, authMiddleware.authorize('superadmin'), deleteAdmin);

module.exports = router;