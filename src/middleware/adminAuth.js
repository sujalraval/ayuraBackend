const jwt = require('jsonwebtoken');
const AdminUser = require('../models/AdminUser');

const adminAuth = async (req, res, next) => {
    try {
        console.log('=== ADMIN AUTH MIDDLEWARE ===');

        // 1. Token extraction
        let token;
        const authHeader = req.header('Authorization');

        if (authHeader?.startsWith('Bearer ')) {
            token = authHeader.replace('Bearer ', '');
            console.log('Token from Authorization header:', token?.substring(0, 20) + '...');
        } else if (req.cookies?.adminToken) {
            token = req.cookies.adminToken;
            console.log('Token from cookie');
        }

        if (!token) {
            console.log('❌ No token found');
            return res.status(401).json({
                success: false,
                message: 'Authentication required. Please log in.'
            });
        }

        // 2. Token verification
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        console.log('✅ Token decoded:', { id: decoded.id, email: decoded.email });

        // 3. Admin lookup
        const admin = await AdminUser.findById(decoded.id).select('-password -__v').lean();
        if (!admin) {
            console.log('❌ Admin not found for ID:', decoded.id);
            return res.status(401).json({
                success: false,
                message: 'Account not found. Please log in again.'
            });
        }

        console.log('✅ Admin found:', { id: admin._id, email: admin.email, role: admin.role });

        if (!admin.isActive) {
            console.log('❌ Admin account deactivated');
            return res.status(403).json({
                success: false,
                message: 'Account deactivated. Contact support.'
            });
        }

        // 4. Password change check
        if (admin.passwordChangedAt && decoded.iat < Math.floor(admin.passwordChangedAt.getTime() / 1000)) {
            console.log('❌ Password changed after token issued');
            return res.status(401).json({
                success: false,
                message: 'Password was changed recently. Please log in again.'
            });
        }

        // 5. Attach admin to request - IMPORTANT: Use req.user for consistency with order controller
        req.user = {
            id: admin._id,
            _id: admin._id, // For backward compatibility
            email: admin.email,
            role: admin.role,
            isAdmin: true,
            permissions: admin.permissions || []
        };

        // Also attach as req.admin for admin-specific routes
        req.admin = req.user;

        console.log('✅ Authentication successful for:', admin.email);
        next();

    } catch (err) {
        console.error('❌ Auth middleware error:', err.message);

        let message = 'Authentication failed';
        let statusCode = 401;

        if (err.name === 'JsonWebTokenError') {
            message = 'Invalid token';
        } else if (err.name === 'TokenExpiredError') {
            message = 'Session expired. Please log in again.';
        } else if (err.name === 'NotBeforeError') {
            message = 'Token not yet valid';
        } else if (err.message.includes('JWT_SECRET')) {
            message = 'Server configuration error';
            statusCode = 500;
        }

        res.status(statusCode).json({
            success: false,
            message,
            error: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }
};

module.exports = adminAuth;