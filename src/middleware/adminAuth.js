const jwt = require('jsonwebtoken');
const AdminUser = require('../models/AdminUser');

const adminAuth = async (req, res, next) => {
    try {
        console.log('=== ADMIN AUTH MIDDLEWARE ===');
        console.log('Headers:', {
            authorization: req.headers.authorization ? 'Present' : 'Missing',
            cookies: req.cookies ? Object.keys(req.cookies) : 'None'
        });

        let token;

        // Extract token from cookies (primary) or Authorization header (fallback)
        if (req.cookies && req.cookies.adminToken) {
            token = req.cookies.adminToken;
            console.log('Token source: Cookie');
        } else if (req.header('Authorization') && req.header('Authorization').startsWith('Bearer ')) {
            token = req.header('Authorization').replace('Bearer ', '');
            console.log('Token source: Authorization header');
        }

        if (!token) {
            console.log('No token found');
            return res.status(401).json({
                success: false,
                message: 'Not authorized, no token'
            });
        }

        try {
            // Verify token
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            console.log('Token decoded successfully:', {
                id: decoded.id,
                email: decoded.email,
                role: decoded.role,
                iat: decoded.iat,
                exp: decoded.exp
            });

            // Find admin
            const admin = await AdminUser.findById(decoded.id).select('-password -__v');

            if (!admin) {
                console.log('Admin not found in database');
                return res.status(401).json({
                    success: false,
                    message: 'Not authorized, admin not found'
                });
            }

            if (!admin.isActive) {
                console.log('Admin account is inactive');
                return res.status(403).json({
                    success: false,
                    message: 'Account deactivated. Contact support.'
                });
            }

            // Check if password was changed after token was issued
            if (admin.passwordChangedAt && decoded.iat < Math.floor(admin.passwordChangedAt.getTime() / 1000)) {
                console.log('Password changed after token issue');
                return res.status(401).json({
                    success: false,
                    message: 'Password was changed recently. Please log in again.'
                });
            }

            // Attach admin to request (both as admin and user for compatibility)
            req.admin = admin;
            req.user = {
                id: admin._id,
                _id: admin._id, // Add both formats for compatibility
                email: admin.email,
                role: admin.role,
                name: admin.name,
                isActive: admin.isActive,
                permissions: admin.permissions || []
            };

            console.log('Admin auth successful:', {
                id: admin._id,
                email: admin.email,
                role: admin.role
            });

            next();

        } catch (jwtError) {
            console.error('JWT verification error:', jwtError.message);

            let message = 'Not authorized, invalid token';

            if (jwtError.name === 'TokenExpiredError') {
                message = 'Not authorized, token expired';
            } else if (jwtError.name === 'JsonWebTokenError') {
                message = 'Not authorized, malformed token';
            }

            // Clear invalid token cookie if it exists
            if (req.cookies && req.cookies.adminToken) {
                res.clearCookie('adminToken', {
                    domain: process.env.NODE_ENV === 'production' ? '.ayuras.life' : undefined,
                    path: '/'
                });
            }

            return res.status(401).json({
                success: false,
                message,
                error: process.env.NODE_ENV === 'development' ? jwtError.message : undefined
            });
        }

    } catch (error) {
        console.error('Auth middleware error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error in authentication',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// Role-based authorization middleware
const authorize = (...roles) => {
    return (req, res, next) => {
        console.log('=== AUTHORIZATION CHECK ===');
        console.log('Required roles:', roles);
        console.log('User role:', req.user?.role);

        if (!req.user) {
            console.log('No user found in request');
            return res.status(401).json({
                success: false,
                message: 'Not authorized'
            });
        }

        if (!roles.includes(req.user.role)) {
            console.log('Role authorization failed');
            return res.status(403).json({
                success: false,
                message: `Access denied. Required role: ${roles.join(' or ')}. Your role: ${req.user.role}`
            });
        }

        console.log('Authorization successful');
        next();
    };
};

// Optional middleware to check if user is admin (any admin role)
const isAdmin = (req, res, next) => {
    const adminRoles = ['admin', 'superadmin', 'labtech'];
    return authorize(...adminRoles)(req, res, next);
};

// Optional middleware to check if user is superadmin specifically
const isSuperAdmin = (req, res, next) => {
    return authorize('superadmin')(req, res, next);
};

module.exports = {
    adminAuth,
    authorize,
    isAdmin,
    isSuperAdmin
};
