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

// Define allowed origins for admin routes
const adminAllowedOrigins = [
    'https://admin.ayuras.life',
    'http://localhost:5173',
    'http://localhost:5000'
];

// Enhanced CORS middleware for admin routes
router.use((req, res, next) => {
    const origin = req.headers.origin;
    console.log(`Incoming request from origin: ${origin}`);

    if (adminAllowedOrigins.includes(origin)) {
        res.header('Access-Control-Allow-Origin', origin);
        res.header('Access-Control-Allow-Credentials', 'true');
        res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
        res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin, Cache-Control, X-File-Name');
        res.header('Access-Control-Expose-Headers', 'Set-Cookie, Date, ETag');
    }

    // Handle preflight requests
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

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

    // Additional headers for CORS
    res.header('Access-Control-Allow-Origin', req.headers.origin);
    res.header('Access-Control-Allow-Credentials', 'true');

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