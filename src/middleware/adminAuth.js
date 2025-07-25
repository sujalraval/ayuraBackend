const jwt = require('jsonwebtoken');
const AdminUser = require('../models/AdminUser');

const adminAuth = async (req, res, next) => {
    try {
        let token;

        // Extract token from cookies (primary) or Authorization header (fallback)
        if (req.cookies && req.cookies.adminToken) {
            token = req.cookies.adminToken;
        } else if (req.header('Authorization') && req.header('Authorization').startsWith('Bearer ')) {
            token = req.header('Authorization').replace('Bearer ', '');
        }

        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'Not authorized, no token'
            });
        }

        try {
            // Verify token
            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            // Find admin
            const admin = await AdminUser.findById(decoded.id).select('-password -__v');

            if (!admin) {
                return res.status(401).json({
                    success: false,
                    message: 'Not authorized, admin not found'
                });
            }

            if (!admin.isActive) {
                return res.status(403).json({
                    success: false,
                    message: 'Account deactivated. Contact support.'
                });
            }

            // Check if password was changed after token was issued
            if (admin.passwordChangedAt && decoded.iat < Math.floor(admin.passwordChangedAt.getTime() / 1000)) {
                return res.status(401).json({
                    success: false,
                    message: 'Password was changed recently. Please log in again.'
                });
            }

            // Attach admin to request
            req.user = {
                id: admin._id,
                email: admin.email,
                role: admin.role,
                name: admin.name,
                isActive: admin.isActive
            };

            next();

        } catch (jwtError) {
            let message = 'Not authorized, invalid token';

            if (jwtError.name === 'TokenExpiredError') {
                message = 'Not authorized, token expired';
            }

            return res.status(401).json({
                success: false,
                message
            });
        }

    } catch (error) {
        console.error('Auth middleware error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error in authentication'
        });
    }
};

// Role-based authorization middleware
const authorize = (...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'Not authorized'
            });
        }

        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: `Access denied. Required role: ${roles.join(' or ')}`
            });
        }

        next();
    };
};

module.exports = { adminAuth, authorize };
