const express = require('express');
const passport = require('passport');
const jwt = require('jsonwebtoken');
const router = express.Router();
const User = require('../models/User');
const { getAllUsers } = require('../controllers/authController');

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

// **CRITICAL FUNCTION**: Get correct client URL
const getClientUrl = () => {
    // Check if we're in production by multiple methods
    const isProduction =
        process.env.NODE_ENV === 'production' ||
        process.env.RAILWAY_ENVIRONMENT === 'production' ||
        process.env.VERCEL_ENV === 'production' ||
        process.env.RENDER_EXTERNAL_URL ||
        process.env.PORT === '80' ||
        process.env.PORT === '443';

    if (isProduction) {
        console.log('🌐 PRODUCTION MODE: Using https://ayuras.life');
        return 'https://ayuras.life';
    } else {
        const devUrl = process.env.CLIENT_URL || 'http://localhost:5173';
        console.log('🔧 DEVELOPMENT MODE: Using', devUrl);
        return devUrl;
    }
};

// Admin: Get all users
router.get('/users', getAllUsers);

// Start Google OAuth
router.get('/google', (req, res, next) => {
    console.log('🔐 Initiating Google OAuth...');
    console.log('🌐 Client URL will be:', getClientUrl());

    passport.authenticate('google', {
        scope: ['profile', 'email'],
        accessType: 'offline',
        prompt: 'consent'
    })(req, res, next);
});

// Handle Google OAuth callback - **MAIN FIX**
router.get('/google/callback',
    passport.authenticate('google', {
        failureRedirect: '/api/v1/auth/error',
        session: false
    }),
    (req, res) => {
        try {
            console.log('✅ Google OAuth callback triggered');
            console.log('📍 Current environment check:');
            console.log('   NODE_ENV:', process.env.NODE_ENV);
            console.log('   HOST:', req.get('host'));
            console.log('   ORIGIN:', req.get('origin'));
            console.log('   REFERER:', req.get('referer'));

            if (!req.user) {
                console.error('❌ No user found in request');
                return res.redirect(`https://ayuras.life/auth/error`);
            }

            const token = generateToken(req.user);
            console.log('🎫 Token generated successfully');

            // **DEFINITIVE FIX**: Force production URL detection
            const clientUrl = getClientUrl();
            const redirectUrl = `${clientUrl}/profile?token=${token}`;

            console.log('🔄 FINAL REDIRECT URL:', redirectUrl);
            console.log('🚀 Executing redirect...');

            res.redirect(redirectUrl);
        } catch (error) {
            console.error('❌ OAuth callback error:', error);
            res.redirect(`https://ayuras.life/auth/error`);
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
        console.error('❌ Auth me error:', error);
        res.status(401).json({ success: false, message: 'Invalid token' });
    }
});

// Logout
router.post('/logout', (req, res) => {
    res.status(200).json({
        success: true,
        message: 'Successfully logged out'
    });
});

// Auth error endpoint
router.get('/error', (req, res) => {
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
