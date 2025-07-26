const express = require('express');
const passport = require('passport');
const jwt = require('jsonwebtoken');
const router = express.Router();
const User = require('../models/User');
const { getAllUsers } = require('../controllers/authController');

// Debug middleware to log environment
router.use((req, res, next) => {
    console.log('Environment Debug:', {
        NODE_ENV: process.env.NODE_ENV,
        CLIENT_URL: process.env.CLIENT_URL,
        timestamp: new Date().toISOString()
    });
    next();
});

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

// Admin: Get all users
router.get('/users', getAllUsers);

// Start Google OAuth
router.get('/google', (req, res, next) => {
    console.log('🔐 Initiating Google OAuth...');
    console.log('Current CLIENT_URL:', process.env.CLIENT_URL);

    passport.authenticate('google', {
        scope: ['profile', 'email'],
        accessType: 'offline',
        prompt: 'consent'
    })(req, res, next);
});

// Handle Google OAuth callback - **MAIN FIX HERE**
router.get('/google/callback',
    passport.authenticate('google', {
        failureRedirect: '/api/v1/auth/error',
        session: false
    }),
    (req, res) => {
        try {
            console.log('✅ Google OAuth success, user:', req.user);

            if (!req.user) {
                console.error('❌ No user found in request');
                return res.redirect(`https://ayuras.life/auth/error`);
            }

            const token = generateToken(req.user);
            console.log('🎫 Generated token:', token.substring(0, 50) + '...');

            // **CRITICAL FIX**: Force production URL regardless of environment variable
            const isProduction = process.env.NODE_ENV === 'production';
            let clientUrl;

            if (isProduction) {
                clientUrl = 'https://ayuras.life';
                console.log('🌐 Using production URL:', clientUrl);
            } else {
                clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
                console.log('🔧 Using development URL:', clientUrl);
            }

            const redirectUrl = `${clientUrl}/?token=${token}`;
            console.log('🔄 Final redirect URL:', redirectUrl);

            res.redirect(redirectUrl);
        } catch (error) {
            console.error('❌ Callback error:', error);
            res.redirect(`https://ayuras.life/auth/error`);
        }
    }
);

// Get current logged-in user
router.get('/me', async (req, res) => {
    try {
        const authHeader = req.header('Authorization');
        console.log('🔍 Auth header received:', authHeader ? 'Present' : 'Missing');

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

        console.log('✅ User authenticated:', user.email);
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
        console.error('❌ Auth me error:', error);
        res.status(401).json({ success: false, message: 'Invalid token' });
    }
});

// Logout
router.post('/logout', (req, res) => {
    console.log('👋 User logging out');
    res.status(200).json({
        success: true,
        message: 'Successfully logged out'
    });
});

// Auth error endpoint
router.get('/error', (req, res) => {
    console.log('❌ Auth error endpoint hit');
    res.status(400).json({
        success: false,
        message: 'Authentication failed. Please try again.'
    });
});

module.exports = router;





// const express = require('express');
// const passport = require('passport');
// const jwt = require('jsonwebtoken');
// const router = express.Router();
// const User = require('../models/User');
// const { getAllUsers } = require('../controllers/authController');

// // Admin: Get all users
// router.get('/users', getAllUsers);

// // Generate JWT Token
// const generateToken = (user) => {
//     return jwt.sign(
//         {
//             id: user._id,
//             email: user.email,
//             name: user.name,
//             role: user.role,
//         },
//         process.env.JWT_SECRET,
//         { expiresIn: process.env.JWT_EXPIRE || '7d' }
//     );
// };

// // Start Google OAuth
// router.get('/google', (req, res, next) => {
//     const state = req.query.redirect
//         ? Buffer.from(JSON.stringify({ redirect: req.query.redirect })).toString('base64')
//         : undefined;

//     passport.authenticate('google', {
//         scope: ['profile', 'email'],
//         accessType: 'offline',
//         prompt: 'consent',
//         state: state
//     })(req, res, next);
// });

// // Handle Google OAuth callback
// router.get('/google/callback',
//     passport.authenticate('google', {
//         failureRedirect: '/auth/error',
//         session: false
//     }),
//     (req, res) => {
//         try {
//             const token = generateToken(req.user);
//             let redirectUrl = '/';

//             // Handle state parameter if it exists
//             if (req.query.state) {
//                 try {
//                     const state = JSON.parse(Buffer.from(req.query.state, 'base64').toString());
//                     if (state.redirect) {
//                         redirectUrl = state.redirect;
//                     }
//                 } catch (e) {
//                     console.error('Error parsing state:', e);
//                 }
//             }

//             // Use secure protocol if in production
//             const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http';
//             const domain = process.env.NODE_ENV === 'production'
//                 ? process.env.CLIENT_URL || 'https://ayuras.life'
//                 : process.env.CLIENT_URL || 'http://localhost:5173';

//             const fullRedirectUrl = `${domain}${redirectUrl}?token=${token}`;
//             res.redirect(fullRedirectUrl);

//         } catch (error) {
//             console.error('Callback error:', error);
//             const domain = process.env.NODE_ENV === 'production'
//                 ? process.env.CLIENT_URL || 'https://ayuras.life'
//                 : process.env.CLIENT_URL || 'http://localhost:5173';
//             res.redirect(`${domain}/auth/error`);
//         }
//     }
// );


// // Get current logged-in user
// router.get('/me', async (req, res) => {
//     try {
//         const authHeader = req.header('Authorization');
//         if (!authHeader?.startsWith('Bearer ')) {
//             return res.status(401).json({
//                 success: false,
//                 message: 'Authorization token missing or invalid'
//             });
//         }

//         const token = authHeader.split(' ')[1];
//         const decoded = jwt.verify(token, process.env.JWT_SECRET);
//         const user = await User.findById(decoded.id);

//         if (!user) {
//             return res.status(404).json({ success: false, message: 'User not found' });
//         }

//         res.status(200).json({
//             success: true,
//             data: {
//                 id: user._id,
//                 name: user.name,
//                 email: user.email,
//                 avatar: user.avatar,
//                 role: user.role,
//                 lastLoginAt: user.lastLoginAt
//             }
//         });
//     } catch (error) {
//         console.error('Auth me error:', error);
//         res.status(401).json({ success: false, message: 'Invalid token' });
//     }
// });

// // Logout
// router.post('/logout', (req, res) => {
//     res.status(200).json({
//         success: true,
//         message: 'Successfully logged out (token should be cleared client-side)'
//     });
// });

// // Auth failure endpoint
// router.get('/error', (req, res) => {
//     res.status(400).json({ success: false, message: 'Authentication failed' });
// });

// module.exports = router;
