const express = require('express');
const passport = require('passport');
const jwt = require('jsonwebtoken');
const router = express.Router();
const User = require('../models/User'); // ✅ Move to top for consistency
const { getAllUsers } = require('../controllers/authController');

// 🧪 Admin: Get all users
router.get('/users', getAllUsers);

// 🔐 Generate JWT Token
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

// 🌐 Start Google OAuth
router.get('/google', (req, res, next) => {
    console.log('Initiating Google OAuth...');
    passport.authenticate('google', {
        scope: ['profile', 'email'],
        accessType: 'offline',
        prompt: 'consent'
    })(req, res, next);
});

// 🌐 Handle Google OAuth callback
router.get('/google/callback',
    passport.authenticate('google', {
        failureRedirect: `${process.env.CLIENT_URL}/auth/error`,
        session: false
    }),
    (req, res) => {
        try {
            console.log('Google OAuth success, user:', req.user);

            const token = generateToken(req.user);

            // 🔁 Redirect with token to frontend
            const redirectUrl = `${process.env.CLIENT_URL}/?token=${token}`;
            res.redirect(redirectUrl);
        } catch (error) {
            console.error('Callback error:', error);
            res.redirect(`${process.env.CLIENT_URL}/auth/error`);
        }
    }
);

// 👤 Get current logged-in user
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

// 🔓 Logout (for token-based auth, this is client-side only)
router.post('/logout', (req, res) => {
    // Just a response – no session or token invalidation needed
    res.status(200).json({
        success: true,
        message: 'Successfully logged out (token should be cleared client-side)'
    });
});

// 🚫 Optional: Frontend fallback for auth failure
router.get('/error', (req, res) => {
    res.status(400).json({ success: false, message: 'Authentication failed' });
});

module.exports = router;
