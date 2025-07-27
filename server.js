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

// Handle preflight requests globally with detailed logging
app.options('*', (req, res, next) => {
    console.log('=== PREFLIGHT REQUEST ===');
    console.log('Origin:', req.get('Origin'));
    console.log('Method:', req.get('Access-Control-Request-Method'));
    console.log('Headers:', req.get('Access-Control-Request-Headers'));
    console.log('URL:', req.url);

    // Manually set CORS headers for preflight
    const origin = req.get('Origin');
    if (origin && allowedOrigins.includes(origin)) {
        res.header('Access-Control-Allow-Origin', origin);
        res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
        res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin, Cache-Control');
        res.header('Access-Control-Allow-Credentials', 'true');
        res.header('Access-Control-Max-Age', '86400'); // 24 hours
    }

    res.status(200).end();
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

// CRITICAL: Enhanced static file serving with proper CORS headers
app.use('/uploads', (req, res, next) => {
    console.log('=== STATIC FILE REQUEST ===');
    console.log('URL:', req.url);
    console.log('Origin:', req.get('Origin'));
    console.log('Method:', req.method);
    console.log('Headers:', req.headers);

    // Set CORS headers for static files
    const origin = req.get('Origin');

    if (origin) {
        // Check if origin is allowed
        const isAllowed = allowedOrigins.includes(origin);
        if (isAllowed) {
            res.set('Access-Control-Allow-Origin', origin);
            console.log('CORS: Origin allowed for static file:', origin);
        } else {
            console.log('CORS: Origin NOT allowed for static file:', origin);
            // Still allow for direct access but log it
            res.set('Access-Control-Allow-Origin', '*');
        }
    } else {
        // For direct access (no origin), allow all
        res.set('Access-Control-Allow-Origin', '*');
        console.log('CORS: No origin, allowing all for static file');
    }

    res.set('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    res.set('Access-Control-Allow-Credentials', 'true');
    res.set('Cross-Origin-Resource-Policy', 'cross-origin');
    res.set('Vary', 'Origin');

    // Handle OPTIONS request for static files
    if (req.method === 'OPTIONS') {
        console.log('OPTIONS request for static file');
        return res.status(200).end();
    }

    next();
}, express.static(path.join(__dirname, 'src', 'uploads'), {
    setHeaders: (res, filePath) => {
        console.log('Setting headers for static file:', filePath);

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
            res.set('Cache-Control', 'public, max-age=31536000'); // 1 year
        } else {
            res.set('Cache-Control', 'no-cache');
        }

        console.log('Final headers for static file:', res.getHeaders());
    }
}));

// Add CORS debugging middleware for all requests
app.use((req, res, next) => {
    if (req.method === 'OPTIONS' || req.get('Origin')) {
        console.log('=== CORS DEBUG ===');
        console.log('Method:', req.method);
        console.log('Origin:', req.get('Origin'));
        console.log('User-Agent:', req.get('User-Agent'));
        console.log('Referer:', req.get('Referer'));
        console.log('Request URL:', req.url);
        console.log('Request Path:', req.path);
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

// API Routes - MUST come after static files but before catch-all
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

// Debug endpoint to check upload directory
app.get('/debug/uploads', (req, res) => {
    const uploadsPath = path.join(__dirname, 'src', 'uploads');
    const expectationsPath = path.join(uploadsPath, 'expectations');

    try {
        const uploadsExists = fs.existsSync(uploadsPath);
        const expectationsExists = fs.existsSync(expectationsPath);

        let files = [];
        if (expectationsExists) {
            files = fs.readdirSync(expectationsPath);
        }

        res.json({
            uploadsPath,
            expectationsPath,
            uploadsExists,
            expectationsExists,
            files: files.slice(0, 10), // Show first 10 files
            totalFiles: files.length,
            sampleUrls: files.slice(0, 3).map(file =>
                `https://ayuras.life/uploads/expectations/${file}`
            ),
            corsHeaders: {
                'Access-Control-Allow-Origin': req.get('Origin') || '*',
                'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
                'Access-Control-Allow-Headers': 'Origin, X-Requested-With, Content-Type, Accept'
            }
        });
    } catch (error) {
        res.status(500).json({
            error: error.message,
            uploadsPath,
            expectationsPath
        });
    }
});

// Test endpoint for image CORS
app.get('/debug/test-image/:filename', (req, res) => {
    const { filename } = req.params;
    const filePath = path.join(__dirname, 'src', 'uploads', 'expectations', filename);

    console.log('=== IMAGE TEST DEBUG ===');
    console.log('Filename:', filename);
    console.log('File path:', filePath);
    console.log('File exists:', fs.existsSync(filePath));
    console.log('Origin:', req.get('Origin'));

    if (fs.existsSync(filePath)) {
        const origin = req.get('Origin');

        // Set CORS headers
        if (origin && allowedOrigins.includes(origin)) {
            res.set('Access-Control-Allow-Origin', origin);
        } else {
            res.set('Access-Control-Allow-Origin', '*');
        }

        res.set('Access-Control-Allow-Methods', 'GET');
        res.set('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
        res.set('Cross-Origin-Resource-Policy', 'cross-origin');

        // Send the file
        res.sendFile(filePath);
    } else {
        res.status(404).json({
            error: 'File not found',
            filename,
            filePath,
            expectedLocation: `/uploads/expectations/${filename}`
        });
    }
});

// In production, serve React app for remaining routes (NOT uploads or API)
if (process.env.NODE_ENV === 'production') {
    // Serve static files from client build
    app.use(express.static(path.join(__dirname, 'client/build')));

    // Catch-all handler: send back React's index.html file for SPA routing
    // This should be LAST and should NOT catch /uploads or /api routes
    app.get('*', (req, res) => {
        // Skip API routes, uploads, and debug routes
        if (req.path.startsWith('/api') ||
            req.path.startsWith('/uploads') ||
            req.path.startsWith('/debug')) {
            return res.status(404).json({
                success: false,
                message: `Route ${req.originalUrl} not found`
            });
        }

        // For all other routes, serve the React app
        const indexPath = path.join(__dirname, 'client/build', 'index.html');
        if (fs.existsSync(indexPath)) {
            res.sendFile(indexPath);
        } else {
            res.status(404).json({
                success: false,
                message: 'React build not found'
            });
        }
    });
}

// Handle 404 for API routes only
app.use('/api/*', (req, res) => {
    res.status(404).json({
        success: false,
        message: `API Route ${req.originalUrl} not found`
    });
});

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

const server = app.listen(PORT, '0.0.0.0', () => {
    const uploadsPath = path.join(__dirname, 'src', 'uploads');
    const expectationsPath = path.join(uploadsPath, 'expectations');

    console.log(`
🚀 Server is running....
📡 Environment: ${process.env.NODE_ENV}
🌐 Port: ${PORT}
📊 Database: Connected
🔗 API Base URL: https://ayuras.life/api/v1
📁 Static files: ${uploadsPath}
📁 Expectations: ${expectationsPath}
🖼️  Image URL format: https://ayuras.life/uploads/expectations/filename.jpg
🌐 CORS enabled for: ${allowedOrigins.join(', ')}
🔧 Trust proxy: ${app.get('trust proxy')}
📁 Uploads directory exists: ${fs.existsSync(uploadsPath)}
📁 Expectations directory exists: ${fs.existsSync(expectationsPath)}
    `);

    // Check if directories exist and create them if needed
    if (!fs.existsSync(uploadsPath)) {
        fs.mkdirSync(uploadsPath, { recursive: true });
        console.log('✅ Created uploads directory');
    }

    if (!fs.existsSync(expectationsPath)) {
        fs.mkdirSync(expectationsPath, { recursive: true });
        console.log('✅ Created expectations directory');
    }

    // List files in expectations directory
    try {
        const files = fs.readdirSync(expectationsPath);
        console.log(`📁 Files in expectations directory: ${files.length}`);
        files.slice(0, 5).forEach(file => {
            console.log(`   - ${file}`);
        });
        if (files.length > 5) {
            console.log(`   ... and ${files.length - 5} more files`);
        }
    } catch (err) {
        console.log('❌ Error reading expectations directory:', err.message);
    }
});

process.on('unhandledRejection', (err, promise) => {
    console.log(`Unhandled Rejection: ${err.message}`);
    server.close(() => {
        process.exit(1);
    });
});

module.exports = app;
