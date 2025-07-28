const jwt = require('jsonwebtoken');
const AdminUser = require('../models/AdminUser');

const adminAuth = async (req, res, next) => {
    try {
        let token;

        // Get token from cookie or header
        if (req.cookies.adminToken) {
            token = req.cookies.adminToken;
        } else if (
            req.headers.authorization &&
            req.headers.authorization.startsWith('Bearer')
        ) {
            token = req.headers.authorization.split(' ')[1];
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

            // Find admin and attach to request
            req.admin = await AdminUser.findById(decoded.id).select('-password');
            req.user = req.admin; // For compatibility

            next();
        } catch (err) {
            console.error('Token verification error:', err);
            return res.status(401).json({
                success: false,
                message: 'Not authorized, token failed'
            });
        }
    } catch (err) {
        console.error('Auth middleware error:', err);
        return res.status(500).json({
            success: false,
            message: 'Server error during authentication'
        });
    }
};

const authorize = (...roles) => {
    return (req, res, next) => {
        if (!req.admin) {
            return res.status(401).json({
                success: false,
                message: 'Not authorized'
            });
        }

        if (!roles.includes(req.admin.role)) {
            return res.status(403).json({
                success: false,
                message: `User role ${req.admin.role} is not authorized to access this route`
            });
        }

        next();
    };
};

const isSuperAdmin = (req, res, next) => {
    if (!req.admin) {
        return res.status(401).json({
            success: false,
            message: 'Not authorized'
        });
    }

    if (req.admin.role !== 'superadmin') {
        return res.status(403).json({
            success: false,
            message: 'Access denied. Requires superadmin privileges'
        });
    }

    next();
};

module.exports = {
    adminAuth,
    authorize,
    isSuperAdmin
};