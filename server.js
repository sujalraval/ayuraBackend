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
app.use(cors({
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
}));

// Handle preflight requests globally with detailed logging
app.options('*', (req, res, next) => {
    console.log('=== PREFLIGHT REQUEST ===');
    console.log('Origin:', req.get('Origin'));
    console.log('Method:', req.get('Access-Control-Request-Method'));
    console.log('Headers:', req.get('Access-Control-Request-Headers'));

    cors()(req, res, next);
});

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

// Static file serving with enhanced CORS headers
app.use('/uploads', express.static(path.join(__dirname, 'src', 'uploads'), {
    setHeaders: (res, filePath) => {
        console.log('Serving static file:', filePath);

        // Get the request origin
        const origin = res.req.get('Origin');

        // Set CORS headers for images based on allowed origins
        if (origin && allowedOrigins.includes(origin)) {
            res.set('Access-Control-Allow-Origin', origin);
        } else if (!origin) {
            // For direct access (no origin), allow all
            res.set('Access-Control-Allow-Origin', '*');
        }

        res.set('Access-Control-Allow-Methods', 'GET');
        res.set('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
        res.set('Cross-Origin-Resource-Policy', 'cross-origin');
        res.set('Vary', 'Origin');

        // Set appropriate content type
        const ext = path.extname(filePath).toLowerCase();
        if (ext === '.jpg' || ext === '.jpeg') {
            res.set('Content-Type', 'image/jpeg');
        } else if (ext === '.png') {
            res.set('Content-Type', 'image/png');
        } else if (ext === '.pdf') {
            res.set('Content-Type', 'application/pdf');
        }

        // Cache control
        if (process.env.NODE_ENV === 'production') {
            res.set('Cache-Control', 'public, max-age=31536000');
        } else {
            res.set('Cache-Control', 'no-cache');
        }
    }
}));

// Add CORS debugging middleware
app.use((req, res, next) => {
    if (req.method === 'OPTIONS' || req.get('Origin')) {
        console.log('=== CORS DEBUG ===');
        console.log('Method:', req.method);
        console.log('Origin:', req.get('Origin'));
        console.log('User-Agent:', req.get('User-Agent'));
        console.log('Referer:', req.get('Referer'));
        console.log('Request URL:', req.url);
    }
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

// API Routes
app.use('/api/v1', require('./src/routes'));

// Debug endpoint for CORS testing
app.get('/debug/cors', (req, res) => {
    res.json({
        origin: req.get('Origin'),
        userAgent: req.get('User-Agent'),
        referer: req.get('Referer'),
        allowedOrigins: allowedOrigins,
        headers: req.headers,
        timestamp: new Date().toISOString()
    });
});

// In production, serve React app for all other routes
if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(__dirname, 'client/build')));

    app.get('*', (req, res) => {
        // Skip API routes and uploads
        if (req.path.startsWith('/api') || req.path.startsWith('/uploads') || req.path.startsWith('/debug')) {
            return res.status(404).json({
                success: false,
                message: `Route ${req.originalUrl} not found`
            });
        }
        res.sendFile(path.join(__dirname, 'client/build', 'index.html'));
    });
}

// Handle 404 routes
app.use('*', (req, res) => {
    res.status(404).json({
        success: false,
        message: `Route ${req.originalUrl} not found`
    });
});

// Enhanced global error handling middleware
app.use((err, req, res, next) => {
    console.error('=== GLOBAL ERROR HANDLER ===');
    console.error('Error:', err.message);
    console.error('Origin:', req.get('Origin'));
    console.error('URL:', req.originalUrl);
    console.error('Method:', req.method);

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

const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`
🚀 Server is running....
📡 Environment: ${process.env.NODE_ENV}
🌐 Port: ${PORT}
📊 Database: Connected
🔗 API Base URL: http://localhost:${PORT}/api/v1
📁 Static files: ${path.join(__dirname, 'src', 'uploads')}
🌐 CORS enabled for: ${allowedOrigins.join(', ')}
🔧 Trust proxy: ${app.get('trust proxy')}
  `);
});

process.on('unhandledRejection', (err, promise) => {
    console.log(`Unhandled Rejection: ${err.message}`);
    server.close(() => {
        process.exit(1);
    });
});

module.exports = app;
