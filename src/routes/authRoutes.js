const express = require('express');
const passport = require('passport');
const jwt = require('jsonwebtoken');
const router = express.Router();
const User = require('../models/User');
const { getAllUsers } = require('../controllers/authController');

// Admin: Get all users
router.get('/users', getAllUsers);

// Generate JWT Token
const generateToken = (user) => {
    return jwt.sign(
        {
            id: user._id,
            email: user.email,
            name: user.name,
            role: user.role,
        },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRE || '7d' }
    );
};

// Start Google OAuth
router.get('/google', (req, res, next) => {
    console.log('Initiating Google OAuth...');
    passport.authenticate('google', {
        scope: ['profile', 'email'],
        accessType: 'offline',
        prompt: 'consent'
    })(req, res, next);
});

// Handle Google OAuth callback
router.get('/google/callback',
    passport.authenticate('google', {
        failureRedirect: `${process.env.CLIENT_URL}/auth/error`,
        session: false
    }),
    (req, res) => {
        try {
            console.log('Google OAuth success, user:', req.user);
            const token = generateToken(req.user);

            // **FIXED**: Use production URL for redirect
            const clientUrl = process.env.CLIENT_URL || 'https://ayuras.life';
            const redirectUrl = `${clientUrl}/?token=${token}`;

            console.log('Redirecting to:', redirectUrl);
            res.redirect(redirectUrl);
        } catch (error) {
            console.error('Callback error:', error);
            const clientUrl = process.env.CLIENT_URL || 'https://ayuras.life';
            res.redirect(`${clientUrl}/auth/error`);
        }
    }
);

// Get current logged-in user
router.get('/me', async (req, res) => {
    try {
        const authHeader = req.header('Authorization');
        if (!authHeader?.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                message: 'Authorization token missing or invalid'
            });
        }

        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id);

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        res.status(200).json({
            success: true,
            data: {
                id: user._id,
                name: user.name,
                email: user.email,
                avatar: user.avatar,
                role: user.role,
                lastLoginAt: user.lastLoginAt
            }
        });
    } catch (error) {
        console.error('Auth me error:', error);
        res.status(401).json({ success: false, message: 'Invalid token' });
    }
});

// Logout
router.post('/logout', (req, res) => {
    res.status(200).json({
        success: true,
        message: 'Successfully logged out (token should be cleared client-side)'
    });
});

// Auth failure endpoint
router.get('/error', (req, res) => {
    res.status(400).json({ success: false, message: 'Authentication failed' });
});

module.exports = router;
