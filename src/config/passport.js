const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/User');

// **CRITICAL**: Determine callback URL based on environment
const getCallbackUrl = () => {
    const isProduction =
        process.env.NODE_ENV === 'production' ||
        process.env.RAILWAY_ENVIRONMENT === 'production' ||
        process.env.VERCEL_ENV === 'production' ||
        process.env.RENDER_EXTERNAL_URL ||
        !process.env.CLIENT_URL ||
        !process.env.CLIENT_URL.includes('localhost');

    if (isProduction) {
        return 'https://ayuras.life/api/v1/auth/google/callback';
    } else {
        return 'http://localhost:5000/api/v1/auth/google/callback';
    }
};

const callbackUrl = getCallbackUrl();
console.log('🔗 Google OAuth Callback URL:', callbackUrl);

passport.use(
    new GoogleStrategy(
        {
            clientID: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            callbackURL: callbackUrl
        },
        async (accessToken, refreshToken, profile, done) => {
            try {
                console.log('🔍 Google profile received:', {
                    id: profile.id,
                    email: profile.emails?.[0]?.value,
                    name: profile.displayName
                });

                let user = await User.findOne({ googleId: profile.id });

                if (user) {
                    console.log('✅ Existing user found:', user.email);
                    user.lastLoginAt = new Date();
                    await user.save();
                    return done(null, user);
                }

                // Check if user exists with same email
                user = await User.findOne({ email: profile.emails[0].value });

                if (user) {
                    console.log('🔄 Linking Google account to existing user:', user.email);
                    user.googleId = profile.id;
                    user.avatar = profile.photos[0]?.value;
                    user.lastLoginAt = new Date();
                    await user.save();
                    return done(null, user);
                }

                // Create new user
                console.log('👤 Creating new user:', profile.emails[0].value);
                user = await User.create({
                    googleId: profile.id,
                    name: profile.displayName,
                    email: profile.emails[0].value,
                    avatar: profile.photos[0]?.value,
                    role: 'user',
                    lastLoginAt: new Date()
                });

                console.log('✅ New user created:', user.email);
                return done(null, user);
            } catch (error) {
                console.error('❌ Google Strategy error:', error);
                return done(error, null);
            }
        }
    )
);

passport.serializeUser((user, done) => {
    done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
    try {
        const user = await User.findById(id);
        done(null, user);
    } catch (error) {
        done(error, null);
    }
});

module.exports = passport;




// const passport = require('passport');
// const GoogleStrategy = require('passport-google-oauth20').Strategy;
// const User = require('../models/User');

// // Debug: Log environment variables (remove in production)
// console.log('Google Client ID:', process.env.GOOGLE_CLIENT_ID ? 'SET' : 'NOT SET');
// console.log('Google Client Secret:', process.env.GOOGLE_CLIENT_SECRET ? 'SET' : 'NOT SET');
// console.log('Google Callback URL:', process.env.GOOGLE_CALLBACK_URL);

// passport.use(new GoogleStrategy({
//     clientID: process.env.GOOGLE_CLIENT_ID,
//     clientSecret: process.env.GOOGLE_CLIENT_SECRET,
//     callbackURL: process.env.GOOGLE_CALLBACK_URL,
//     scope: ['profile', 'email'],
//     passReqToCallback: false
// },
//     async (accessToken, refreshToken, profile, done) => {
//         try {
//             console.log('Google OAuth Profile:', {
//                 id: profile.id,
//                 name: profile.displayName,
//                 email: profile.emails?.[0]?.value
//             });

//             // Check if user already exists with this Google ID
//             let user = await User.findOne({ googleId: profile.id });

//             if (user) {
//                 // Update last login time
//                 user.lastLoginAt = new Date();
//                 await user.save();
//                 return done(null, user);
//             }

//             // Check if user exists with same email
//             user = await User.findOne({ email: profile.emails[0].value });

//             if (user) {
//                 // Link Google account to existing user
//                 user.googleId = profile.id;
//                 user.avatar = profile.photos[0]?.value;
//                 user.lastLoginAt = new Date();
//                 await user.save();
//                 return done(null, user);
//             }

//             // Create new user
//             user = await User.create({
//                 googleId: profile.id,
//                 name: profile.displayName,
//                 email: profile.emails[0].value,
//                 avatar: profile.photos[0]?.value,
//                 lastLoginAt: new Date(),
//                 isEmailVerified: true // Since Google verified the email
//             });

//             return done(null, user);
//         } catch (error) {
//             console.error('Google OAuth error:', error);
//             return done(error, null);
//         }
//     }
// ));

// passport.serializeUser((user, done) => {
//     done(null, user.id);
// });

// passport.deserializeUser(async (id, done) => {
//     try {
//         const user = await User.findById(id);
//         done(null, user);
//     } catch (error) {
//         done(error, null);
//     }
// });

// module.exports = passport;