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

// Trust proxy for production
app.set('trust proxy', 1);

// Define allowed origins
const allowedOrigins = [
    'https://admin.ayuras.life',
    'https://www.admin.ayuras.life',
    'https://ayuras.life',
    'https://www.ayuras.life',
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:3000'
];

// CORS configuration
const corsOptions = {
    origin: function (origin, callback) {
        console.log('CORS Request from origin:', origin);

        if (!origin) {
            return callback(null, true);
        }

        const isAllowed = allowedOrigins.some(allowedOrigin => {
            if (allowedOrigin === origin) return true;
            if (allowedOrigin.includes('www.') && origin === allowedOrigin.replace('www.', '')) return true;
            if (!allowedOrigin.includes('www.') && origin === allowedOrigin.replace('https://', 'https://www.')) return true;
            return false;
        });

        if (isAllowed) {
            console.log('Origin allowed:', origin);
            callback(null, true);
        } else {
            console.log('CORS blocked origin:', origin);
            callback(null, true); // Allow all for now
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
        'X-File-Name'
    ],
    credentials: true,
    optionsSuccessStatus: 200
};

// Apply CORS globally
app.use(cors(corsOptions));

// Handle preflight requests
app.options('*', cors(corsOptions));

// Updated Helmet configuration
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
            objectSrc: ["'self'", "*.ayuras.life"],
            frameSrc: ["'self'", "*.ayuras.life"],
        },
    } : false
}));

// CRITICAL: Static file serving BEFORE any other routes
// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'src', 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
    console.log('Created uploads directory:', uploadsDir);
}

// Enhanced static file middleware with detailed logging
app.use('/uploads', (req, res, next) => {
    console.log('=== STATIC FILE REQUEST ===');
    console.log('Requested URL:', req.url);
    console.log('Full URL:', req.originalUrl);
    console.log('Method:', req.method);
    console.log('Origin:', req.get('Origin'));
    console.log('User-Agent:', req.get('User-Agent'));

    // Construct file path
    const filePath = path.join(__dirname, 'src', 'uploads', req.url);
    console.log('Looking for file at:', filePath);
    console.log('File exists:', fs.existsSync(filePath));

    // Set CORS headers for static files
    const origin = req.get('Origin');
    if (origin && allowedOrigins.includes(origin)) {
        res.set('Access-Control-Allow-Origin', origin);
    } else {
        res.set('Access-Control-Allow-Origin', '*');
    }

    res.set('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    res.set('Access-Control-Allow-Credentials', 'true');
    res.set('Cross-Origin-Resource-Policy', 'cross-origin');

    // Handle OPTIONS request
    if (req.method === 'OPTIONS') {
        console.log('OPTIONS request for static file - responding with 200');
        return res.status(200).end();
    }

    next();
}, express.static(path.join(__dirname, 'src', 'uploads'), {
    setHeaders: (res, filePath, stat) => {
        console.log('=== SETTING HEADERS FOR FILE ===');
        console.log('File path:', filePath);
        console.log('File stats:', {
            size: stat.size,
            mtime: stat.mtime
        });

        // Set appropriate content type
        const ext = path.extname(filePath).toLowerCase();
        console.log('File extension:', ext);

        if (ext === '.pdf') {
            res.set('Content-Type', 'application/pdf');
            res.set('Content-Disposition', 'inline; filename="' + path.basename(filePath) + '"');
            console.log('Set PDF headers');
        } else if (ext === '.jpg' || ext === '.jpeg') {
            res.set('Content-Type', 'image/jpeg');
        } else if (ext === '.png') {
            res.set('Content-Type', 'image/png');
        }

        // Security headers
        res.set('X-Content-Type-Options', 'nosniff');
        res.set('X-Frame-Options', 'SAMEORIGIN');

        // Cache control
        if (process.env.NODE_ENV === 'production') {
            res.set('Cache-Control', 'public, max-age=31536000'); // 1 year
        } else {
            res.set('Cache-Control', 'no-cache');
        }

        console.log('Final headers set:', res.getHeaders());
    },
    // Additional options
    maxAge: process.env.NODE_ENV === 'production' ? '1y' : 0,
    etag: true,
    lastModified: true,
    index: false, // Disable directory listing
    dotfiles: 'deny' // Deny access to dotfiles
}));

// Add specific route for debugging file access
app.get('/uploads/*', (req, res, next) => {
    console.log('=== DIRECT UPLOADS ROUTE HIT ===');
    console.log('URL:', req.url);
    console.log('Params:', req.params);

    const filePath = path.join(__dirname, 'src', 'uploads', req.url.replace('/uploads/', ''));
    console.log('Direct route file path:', filePath);
    console.log('File exists:', fs.existsSync(filePath));

    if (fs.existsSync(filePath)) {
        console.log('File found, serving directly');
        res.sendFile(filePath);
    } else {
        console.log('File not found, passing to next middleware');
        next();
    }
});

app.use(morgan('dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Session configuration
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

// Debug middleware to log all requests
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.originalUrl}`);
    next();
});

// API Routes - MUST come after static files
app.use('/api/v1', require('./src/routes'));

// Health check route
app.get('/health', (req, res) => {
    res.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        uploads_dir: path.join(__dirname, 'src', 'uploads'),
        uploads_exists: fs.existsSync(path.join(__dirname, 'src', 'uploads'))
    });
});

// Test route for file listing
app.get('/debug/uploads', (req, res) => {
    const uploadsPath = path.join(__dirname, 'src', 'uploads');
    try {
        const listFiles = (dir, prefix = '') => {
            const files = fs.readdirSync(dir);
            let result = [];

            files.forEach(file => {
                const filePath = path.join(dir, file);
                const stat = fs.statSync(filePath);

                if (stat.isDirectory()) {
                    result = result.concat(listFiles(filePath, prefix + file + '/'));
                } else {
                    result.push({
                        path: prefix + file,
                        size: stat.size,
                        modified: stat.mtime,
                        url: `https://ayuras.life/uploads/${prefix}${file}`
                    });
                }
            });

            return result;
        };

        const files = listFiles(uploadsPath);
        res.json({
            uploads_directory: uploadsPath,
            total_files: files.length,
            files: files
        });
    } catch (error) {
        res.status(500).json({
            error: error.message,
            uploads_directory: uploadsPath,
            directory_exists: fs.existsSync(uploadsPath)
        });
    }
});

// Handle 404 for API routes only
app.use('/api/*', (req, res) => {
    res.status(404).json({
        success: false,
        message: `API Route ${req.originalUrl} not found`
    });
});

// Catch-all handler for non-API routes
app.use('*', (req, res) => {
    console.log('=== CATCH-ALL ROUTE HIT ===');
    console.log('URL:', req.originalUrl);
    console.log('Method:', req.method);

    // Don't handle uploads here
    if (req.originalUrl.startsWith('/uploads/')) {
        return res.status(404).json({
            success: false,
            message: 'File not found'
        });
    }

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
📁 Uploads Directory: ${path.join(__dirname, 'src', 'uploads')}
📂 Uploads Exists: ${fs.existsSync(path.join(__dirname, 'src', 'uploads'))}
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
