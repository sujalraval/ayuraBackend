// middleware/auth.js
const jwt = require('jsonwebtoken');
const User = require('../models/User');

exports.protect = async (req, res, next) => {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
        console.log('❌ No token provided');
        return res.status(401).json({
            success: false,
            message: 'Not authorized, no token'
        });
    }

    try {
        console.log('🔍 Verifying token...');
        console.log('JWT_SECRET exists:', !!process.env.JWT_SECRET);
        console.log('Token preview:', token.substring(0, 20) + '...');

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        console.log('✅ Token decoded:', decoded);

        // Look up user
        const user = await User.findById(decoded.id).select('-password');
        console.log('👤 User lookup result:', user ? {
            id: user._id,
            email: user.email,
            role: user.role,
            isActive: user.isActive
        } : 'User not found');

        if (!user) {
            console.log('❌ User not found in database');
            return res.status(401).json({
                success: false,
                message: 'User not found'
            });
        }

        if (!user.isActive) {
            console.log('❌ User account is deactivated');
            return res.status(401).json({
                success: false,
                message: 'Account is deactivated'
            });
        }

        // Set user in request
        req.user = {
            id: user._id.toString(),
            _id: user._id,
            email: user.email,
            name: user.name,
            role: user.role,
            isAdmin: user.role === 'admin' || user.role === 'superadmin',
            isSuperAdmin: user.role === 'superadmin'
        };

        console.log('✅ User set in req.user:', {
            id: req.user.id,
            email: req.user.email,
            role: req.user.role
        });

        next();
    } catch (error) {
        console.error('❌ Token verification failed:', error.message);

        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                success: false,
                message: 'Token expired'
            });
        } else if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({
                success: false,
                message: 'Invalid token'
            });
        } else {
            return res.status(401).json({
                success: false,
                message: 'Not authorized, token failed'
            });
        }
    }
};

exports.authorize = (...roles) => {
    return (req, res, next) => {
        console.log('🔐 Authorization check:', {
            requiredRoles: roles,
            userRole: req.user?.role,
            userId: req.user?.id
        });

        if (!req.user || !req.user.role || !roles.includes(req.user.role)) {
            console.log(`❌ Authorization failed`);
            return res.status(403).json({
                success: false,
                message: `Role '${req.user?.role || 'none'}' not authorized. Required: ${roles.join(', ')}`
            });
        }

        console.log('✅ Authorization successful');
        next();
    };
};
