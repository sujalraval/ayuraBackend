const User = require('../models/User');
const jwt = require('jsonwebtoken');

// Generate JWT Token
const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRE
    });
};

// @desc    Get all users (Admin only)
// @route   GET /api/v1/auth/users
// @access  Private (Admin only)
exports.getAllUsers = async (req, res) => {
    
    try {
        const users = await User.find().select('-password'); // Exclude password

        res.status(200).json({
            status: "success",
            count: users.length,
            data:users
        });
    } catch (error) {
        console.error('Get all users error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while fetching users'
        });
    }
};


// @desc    Google OAuth Success
// @route   GET /api/v1/auth/google/success
// @access  Private
exports.googleAuthSuccess = async (req, res) => {
    try {
        if (req.user) {
            const token = generateToken(req.user._id);

            // Redirect to frontend with token
            res.redirect(`${process.env.CLIENT_URL}/profile?token=${token}`);
        } else {
            res.redirect(`${process.env.CLIENT_URL}/auth/failure`);
        }
    } catch (error) {
        console.error('Google auth success error:', error);
        res.redirect(`${process.env.CLIENT_URL}/auth/failure`);
    }
};

// @desc    Google OAuth Failure
// @route   GET /api/v1/auth/google/failure
// @access  Public
exports.googleAuthFailure = (req, res) => {
    res.redirect(`${process.env.CLIENT_URL}/auth/failure`);
};

// @desc    Logout user
// @route   POST /api/v1/auth/logout
// @access  Private
exports.logout = (req, res) => {
    req.logout((err) => {
        if (err) {
            return res.status(500).json({
                success: false,
                message: 'Error logging out'
            });
        }
        res.json({
            success: true,
            message: 'Logged out successfully'
        });
    });
};

// @desc    Get current logged in user
// @route   GET /api/v1/auth/me
// @access  Private
exports.getMe = async (req, res) => {
    try {
        const user = await User.findById(req.user.id);

        res.json({
            success: true,
            user
        });
    } catch (error) {
        console.error('Get me error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};

// @desc    Update user profile
// @route   PUT /api/v1/auth/profile
// @access  Private
exports.updateProfile = async (req, res) => {
    try {
        const { name, phone, dateOfBirth, gender, address } = req.body;

        const user = await User.findByIdAndUpdate(
            req.user.id,
            {
                name: name || req.user.name,
                phone: phone || req.user.phone,
                dateOfBirth: dateOfBirth || req.user.dateOfBirth,
                gender: gender || req.user.gender,
                address: address || req.user.address
            },
            { new: true, runValidators: true }
        );

        res.json({
            success: true,
            message: 'Profile updated successfully',
            user
        });
    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error during profile update'
        });
    }
};

// @desc    Get user statistics (for admin)
// @route   GET /api/v1/auth/stats
// @access  Private (Admin only)
exports.getUserStats = async (req, res) => {
    try {
        const totalUsers = await User.countDocuments();
        const activeUsers = await User.countDocuments({ isActive: true });
        const newUsersThisMonth = await User.countDocuments({
            createdAt: { $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) }
        });

        res.json({
            success: true,
            stats: {
                totalUsers,
                activeUsers,
                newUsersThisMonth
            }
        });
    } catch (error) {
        console.error('Get user stats error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while fetching user statistics'
        });
    }
};