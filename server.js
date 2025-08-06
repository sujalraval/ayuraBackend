const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const session = require('express-session');
const path = require('path');
const fs = require('fs');

// Load environment variables FIRST
dotenv.config();

// Import passport after env vars are loaded
const passport = require('./src/config/passport');
const connectDB = require('./src/config/database');

// Connect to database
connectDB();

const app = express();

// Trust proxy for production (CRITICAL for domain detection)
app.set('trust proxy', 1);

// Define allowed origins with both your domains
const allowedOrigins = [
    'https://admin.ayuras.life',
    'https://www.admin.ayuras.life',
    'https://ayuras.life',
    'https://www.ayuras.life',
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:3000'
];

// Enhanced CORS middleware with proper multiple domain handling
const corsOptions = {
    origin: function (origin, callback) {
        console.log('CORS Request from origin:', origin);

        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) {
            console.log('No origin header - allowing request');
            return callback(null, true);
        }

        // Check if the origin is in allowed origins
        const isAllowed = allowedOrigins.some(allowedOrigin => {
            // Handle both exact match and wildcard subdomains
            if (allowedOrigin === origin) return true;

            // Handle www variations
            if (allowedOrigin.includes('www.') && origin === allowedOrigin.replace('www.', '')) return true;
            if (!allowedOrigin.includes('www.') && origin === allowedOrigin.replace('https://', 'https://www.')) return true;

            return false;
        });

        if (isAllowed) {
            console.log('Origin allowed:', origin);
            callback(null, true);
        } else {
            console.log('CORS blocked origin:', origin);
            console.log('Allowed origins:', allowedOrigins);
            callback(new Error('Not allowed by CORS'));
        }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: [
        'Content-Type',
        'Authorization',
        'X-Requested-With',
        'Accept',
        'Origin',
        'Cache-Control',
        'X-File-Name',
        'X-Forwarded-For',
        'X-Forwarded-Proto',
        'X-Forwarded-Host'
    ],
    credentials: true,
    optionsSuccessStatus: 200,
    preflightContinue: false,
    exposedHeaders: ['Set-Cookie', 'Date', 'ETag']
};

// Apply CORS globally
app.use(cors(corsOptions));

// Updated Helmet configuration for production
app.use(helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" },
    contentSecurityPolicy: process.env.NODE_ENV === 'production' ? {
        directives: {
            defaultSrc: ["'self'"],
            imgSrc: ["'self'", "data:", "https:", "http:", "*.ayuras.life"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'"],
            connectSrc: ["'self'", "https:", "http:", "*.ayuras.life"],
            fontSrc: ["'self'", "https:", "data:"],
        },
    } : false
}));

// FIXED: Corrected static file serving path
app.use('/uploads', express.static(path.join(__dirname, 'src', 'uploads'), {
    setHeaders: (res, filePath) => {
        console.log('Serving static file:', filePath);

        res.set('Cross-Origin-Resource-Policy', 'cross-origin');
        res.set('Cross-Origin-Opener-Policy', 'same-origin');
        res.set('Cache-Control', 'public, max-age=31536000');

        // Set appropriate content type
        const ext = path.extname(filePath).toLowerCase();
        if (ext === '.jpg' || ext === '.jpeg') {
            res.set('Content-Type', 'image/jpeg');
        } else if (ext === '.png') {
            res.set('Content-Type', 'image/png');
        } else if (ext === '.pdf') {
            res.set('Content-Type', 'application/pdf');
        }
    }
}));

// Optional: Debug middleware for static files (remove in production)
app.use('/uploads', (req, res, next) => {
    console.log('=== STATIC FILE REQUEST ===');
    console.log('URL:', req.url);
    console.log('Method:', req.method);
    console.log('Looking for file at:', path.join(__dirname, 'src', 'uploads', req.url));

    const filePath = path.join(__dirname, 'src', 'uploads', req.url);
    console.log('File exists:', fs.existsSync(filePath));

    next();
});

app.use(morgan('dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Session configuration with domain-specific settings
app.use(session({
    secret: process.env.SESSION_SECRET || 'your-fallback-secret',
    resave: false,
    saveUninitialized: false,
    name: 'ayuras.sid',
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000,
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
        domain: process.env.NODE_ENV === 'production' ? '.ayuras.life' : undefined
    }
}));

// Passport middleware
app.use(passport.initialize());
app.use(passport.session());

// API Routes - MUST come after static files but before catch-all
app.use('/api/v1', require('./src/routes'));

// Handle 404 for API routes only
// app.use('/api/*', (req, res) => {
//     res.status(404).json({
//         success: false,
//         message: `API Route ${req.originalUrl} not found`
//     });
// });

// Enhanced global error handling middleware
app.use((err, req, res, next) => {
    console.error('=== GLOBAL ERROR HANDLER ===');
    console.error('Error:', err.message);
    console.error('Origin:', req.get('Origin'));
    console.error('URL:', req.originalUrl);
    console.error('Method:', req.method);
    console.error('Stack:', err.stack);

    if (err.message === 'Not allowed by CORS') {
        return res.status(403).json({
            success: false,
            message: 'CORS policy violation',
            origin: req.headers.origin,
            allowedOrigins: allowedOrigins
        });
    }

    res.status(500).json({
        success: false,
        message: process.env.NODE_ENV === 'production' ? 'Server Error' : err.message
    });
});

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
    console.log(`
🚀 Server is running....
📡 Environment: ${process.env.NODE_ENV}
🌐 Port: ${PORT}
📊 Database: Connected
🔗 API Base URL: https://ayuras.life/api/v1
🌐 CORS enabled for: ${allowedOrigins.join(', ')}
🔧 Trust proxy: ${app.get('trust proxy')}
📁 Static files: ${path.join(__dirname, 'src', 'uploads')}
    `);
});

process.on('unhandledRejection', (err, promise) => {
    console.log(`Unhandled Rejection: ${err.message}`);
    server.close(() => {
        process.exit(1);
    });
});

module.exports = app;
