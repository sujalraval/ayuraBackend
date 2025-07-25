const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const AdminUser = require('../models/AdminUser');

// Generate JWT Token
const generateToken = (id, email, role) => {
    return jwt.sign(
        { id, email, role },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRE || '7d' }
    );
};

/**
 * @desc    Admin login
 * @route   POST /api/v1/admin/login
 * @access  Public
 */
exports.adminLogin = async (req, res) => {
    try {
        const { email, password } = req.body;
        console.log('Login attempt for:', email, 'from origin:', req.headers.origin);

        if (!email || !password) {
            console.log('Missing email or password');
            return res.status(400).json({
                success: false,
                message: 'Email and password required'
            });
        }

        // Find admin with password
        const admin = await AdminUser.findOne({ email: email.trim() }).select('+password');

        if (!admin) {
            console.log('Admin not found:', email);
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }

        if (!admin.isActive) {
            console.log('Admin account inactive:', email);
            return res.status(403).json({
                success: false,
                message: 'Account deactivated. Contact support.'
            });
        }

        // Verify password
        const isMatch = await admin.matchPassword(password);
        console.log('Password match result:', isMatch);

        if (!isMatch) {
            console.log('Password mismatch for:', email);
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }

        // Generate token
        const token = generateToken(admin._id, admin.email, admin.role);
        console.log('Login successful for:', email);

        // Set cookie with enhanced security for production
        const isProduction = process.env.NODE_ENV === 'production';
        res.cookie('adminToken', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
            maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
            domain: process.env.NODE_ENV === 'production' ? '.ayuras.life' : 'localhost',
            path: '/'
        });

        // Update last login
        admin.lastLogin = new Date();
        await admin.save();

        // Send response with token in both cookie and body
        res.status(200).json({
            success: true,
            token, // For clients that prefer to store token in localStorage
            admin: {
                id: admin._id,
                email: admin.email,
                role: admin.role,
                name: admin.name,
                permissions: admin.permissions || []
            },
            // Add these for better client-side handling
            expiresIn: 7 * 24 * 60 * 60 * 1000,
            tokenType: 'Bearer'
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            message: 'Login failed',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

/**
 * @desc    Create super admin (for initial setup only)
 * @route   POST /api/v1/admin/create-super-admin
 * @access  Public (should be disabled in production)
 */
exports.createSuperAdmin = async (req, res) => {
    try {
        // Disable this route in production unless specifically enabled
        if (process.env.NODE_ENV === 'production' && process.env.ALLOW_SUPERADMIN_CREATION !== 'true') {
            return res.status(403).json({
                success: false,
                message: 'Super admin creation is disabled in production'
            });
        }

        const { email, password, name } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Email and password are required'
            });
        }

        // Check if admin already exists
        const existingAdmin = await AdminUser.findOne({ email });
        if (existingAdmin) {
            return res.status(400).json({
                success: false,
                message: 'Admin with this email already exists'
            });
        }

        // Create super admin (password will be hashed by pre-save hook)
        const superAdmin = new AdminUser({
            email,
            password,
            name: name || 'Super Admin',
            role: 'superadmin',
            isActive: true,
            permissions: ['all']
        });

        await superAdmin.save();

        // Generate token
        const token = generateToken(superAdmin._id, superAdmin.email, superAdmin.role);

        res.status(201).json({
            success: true,
            message: 'Super admin created successfully',
            token,
            admin: {
                id: superAdmin._id,
                email: superAdmin.email,
                role: superAdmin.role,
                name: superAdmin.name,
                permissions: superAdmin.permissions
            }
        });

    } catch (error) {
        console.error('Create super admin error:', error);

        if (error.code === 11000) {
            return res.status(400).json({
                success: false,
                message: 'Admin with this email already exists'
            });
        }

        res.status(500).json({
            success: false,
            message: 'Server error creating super admin',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

/**
 * @desc    Get admin profile
 * @route   GET /api/v1/admin/profile
 * @access  Private
 */
exports.getAdminProfile = async (req, res) => {
    try {
        const admin = await AdminUser.findById(req.user.id).select('-password -__v');

        if (!admin) {
            return res.status(404).json({
                success: false,
                message: 'Admin profile not found'
            });
        }

        res.status(200).json({
            success: true,
            admin: {
                id: admin._id,
                email: admin.email,
                role: admin.role,
                name: admin.name,
                isActive: admin.isActive,
                permissions: admin.permissions || [],
                lastLogin: admin.lastLogin,
                createdAt: admin.createdAt,
                updatedAt: admin.updatedAt
            }
        });

    } catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error fetching profile',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

/**
 * @desc    Get all admins (super admin only)
 * @route   GET /api/v1/admin/all
 * @access  Private/SuperAdmin
 */
exports.getAllAdmins = async (req, res) => {
    try {
        // Check if user is super admin
        if (req.user.role !== 'superadmin') {
            return res.status(403).json({
                success: false,
                message: 'Access denied. Super admin role required.'
            });
        }

        const admins = await AdminUser.find().select('-password -__v').sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            count: admins.length,
            admins
        });

    } catch (error) {
        console.error('Get all admins error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error fetching admins',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

/**
 * @desc    Create new admin (super admin only)
 * @route   POST /api/v1/admin/create
 * @access  Private/SuperAdmin
 */
exports.createAdmin = async (req, res) => {
    try {
        // Check if user is super admin
        if (req.user.role !== 'superadmin') {
            return res.status(403).json({
                success: false,
                message: 'Access denied. Super admin role required.'
            });
        }

        const { email, password, name, role, permissions } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Email and password are required'
            });
        }

        // Check if admin already exists
        const existingAdmin = await AdminUser.findOne({ email });
        if (existingAdmin) {
            return res.status(400).json({
                success: false,
                message: 'Admin with this email already exists'
            });
        }

        // Create admin (password will be hashed by pre-save hook)
        const admin = new AdminUser({
            email,
            password,
            name: name || email.split('@')[0],
            role: role || 'admin',
            isActive: true,
            permissions: permissions || []
        });

        await admin.save();

        res.status(201).json({
            success: true,
            message: 'Admin created successfully',
            admin: {
                id: admin._id,
                email: admin.email,
                role: admin.role,
                name: admin.name,
                permissions: admin.permissions
            }
        });

    } catch (error) {
        console.error('Create admin error:', error);

        if (error.code === 11000) {
            return res.status(400).json({
                success: false,
                message: 'Admin with this email already exists'
            });
        }

        res.status(500).json({
            success: false,
            message: 'Server error creating admin',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

/**
 * @desc    Update admin
 * @route   PUT /api/v1/admin/:id
 * @access  Private/SuperAdmin
 */
exports.updateAdmin = async (req, res) => {
    try {
        // Check if user is super admin or updating own profile
        if (req.user.role !== 'superadmin' && req.user.id !== req.params.id) {
            return res.status(403).json({
                success: false,
                message: 'Access denied. Insufficient privileges.'
            });
        }

        const { name, role, permissions, isActive, password } = req.body;

        const admin = await AdminUser.findById(req.params.id);

        if (!admin) {
            return res.status(404).json({
                success: false,
                message: 'Admin not found'
            });
        }

        // Update fields
        if (name !== undefined) admin.name = name;
        if (role !== undefined && req.user.role === 'superadmin') admin.role = role;
        if (permissions !== undefined && req.user.role === 'superadmin') admin.permissions = permissions;
        if (isActive !== undefined && req.user.role === 'superadmin') admin.isActive = isActive;

        // Handle password change
        if (password) {
            admin.password = password;
            admin.passwordChangedAt = Date.now();
        }

        await admin.save();

        res.status(200).json({
            success: true,
            message: 'Admin updated successfully',
            admin: {
                id: admin._id,
                email: admin.email,
                role: admin.role,
                name: admin.name,
                permissions: admin.permissions,
                isActive: admin.isActive
            }
        });

    } catch (error) {
        console.error('Update admin error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error updating admin',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

/**
 * @desc    Delete admin
 * @route   DELETE /api/v1/admin/:id
 * @access  Private/SuperAdmin
 */
exports.deleteAdmin = async (req, res) => {
    try {
        // Check if user is super admin
        if (req.user.role !== 'superadmin') {
            return res.status(403).json({
                success: false,
                message: 'Access denied. Super admin role required.'
            });
        }

        const admin = await AdminUser.findById(req.params.id);

        if (!admin) {
            return res.status(404).json({
                success: false,
                message: 'Admin not found'
            });
        }

        // Prevent deleting super admin
        if (admin.role === 'superadmin') {
            return res.status(400).json({
                success: false,
                message: 'Cannot delete super admin'
            });
        }

        await AdminUser.findByIdAndDelete(req.params.id);

        res.status(200).json({
            success: true,
            message: 'Admin deleted successfully'
        });

    } catch (error) {
        console.error('Delete admin error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error deleting admin',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

/**
 * @desc    Refresh token
 * @route   POST /api/v1/admin/refresh-token
 * @access  Private
 */
exports.refreshToken = async (req, res) => {
    try {
        // Try to get token from cookies first, then from body
        const token = req.cookies.adminToken || req.body.token;

        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'Refresh token required'
            });
        }

        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Check if admin still exists
        const admin = await AdminUser.findById(decoded.id);

        if (!admin || !admin.isActive) {
            return res.status(401).json({
                success: false,
                message: 'Invalid refresh token'
            });
        }

        // Generate new token
        const newToken = generateToken(admin._id, admin.email, admin.role);

        // Set new cookie
        const isProduction = process.env.NODE_ENV === 'production';
        res.cookie('adminToken', newToken, {
            httpOnly: true,
            secure: isProduction,
            sameSite: isProduction ? 'none' : 'lax',
            maxAge: 7 * 24 * 60 * 60 * 1000,
            domain: isProduction ? '.ayuras.life' : undefined,
            path: '/'
        });

        res.status(200).json({
            success: true,
            token: newToken,
            admin: {
                id: admin._id,
                email: admin.email,
                role: admin.role,
                name: admin.name,
                permissions: admin.permissions
            }
        });

    } catch (error) {
        console.error('Refresh token error:', error);

        // Clear invalid token cookie
        res.clearCookie('adminToken', {
            domain: process.env.NODE_ENV === 'production' ? '.ayuras.life' : undefined,
            path: '/'
        });

        res.status(401).json({
            success: false,
            message: 'Invalid refresh token',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};
/**
 * @desc Admin logout
 * @route POST /api/v1/admin/logout
 * @access Private
 */
exports.adminLogout = async (req, res) => {
    try {
        const isProduction = process.env.NODE_ENV === 'production';

        // Clear cookie with proper options
        res.clearCookie('adminToken', {
            domain: isProduction ? '.ayuras.life' : undefined,
            path: '/',
            httpOnly: true,
            secure: isProduction,
            sameSite: isProduction ? 'none' : 'lax'
        });

        res.status(200).json({
            success: true,
            message: 'Logged out successfully'
        });
    } catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error during logout'
        });
    }
};
