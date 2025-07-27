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

// Trust proxy for production (IMPORTANT for production)
app.set('trust proxy', 1);

const allowedOrigins = [
    'https://admin.ayuras.life',
    'https://www.admin.ayuras.life',
    'http://localhost:5173',
    'http://localhost:5174',
    'https://ayuras.life'
];

// Enhanced CORS middleware for API routes
app.use(cors({
    origin: function (origin, callback) {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            console.log('CORS blocked origin:', origin);
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
        'X-File-Name'
    ],
    credentials: true,
    optionsSuccessStatus: 200,
    preflightContinue: false,
    exposedHeaders: ['Set-Cookie', 'Date', 'ETag']
}));

// Handle preflight requests globally
app.options('*', cors());

// Updated Helmet configuration for production file serving
app.use(helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    contentSecurityPolicy: process.env.NODE_ENV === 'production' ? {
        directives: {
            defaultSrc: ["'self'"],
            imgSrc: ["'self'", "data:", "https:", "http:"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'"],
            connectSrc: ["'self'", "https:", "http:"],
        },
    } : false
}));

// Static file serving with enhanced configuration for production
app.use('/uploads', express.static(path.join(__dirname, 'src', 'uploads'), {
    setHeaders: (res, filePath) => {
        console.log('Serving static file:', filePath);

        // Set CORS headers for images
        res.set('Cross-Origin-Resource-Policy', 'cross-origin');
        res.set('Access-Control-Allow-Origin', '*');
        res.set('Access-Control-Allow-Methods', 'GET');
        res.set('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');

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
    },
    // Enable directory indexing in development for debugging
    index: process.env.NODE_ENV !== 'production'
}));

// Add debug route for production file serving
app.get('/debug/uploads/:subfolder/:filename?', (req, res) => {
    const { subfolder, filename } = req.params;

    if (!filename) {
        // List files in subfolder
        const dirPath = path.join(__dirname, 'src', 'uploads', subfolder);

        try {
            if (fs.existsSync(dirPath)) {
                const files = fs.readdirSync(dirPath);
                res.json({
                    success: true,
                    path: dirPath,
                    files: files,
                    count: files.length
                });
            } else {
                res.status(404).json({
                    success: false,
                    error: 'Directory not found',
                    path: dirPath
                });
            }
        } catch (err) {
            res.status(500).json({
                success: false,
                error: err.message
            });
        }
    } else {
        // Check specific file
        const filePath = path.join(__dirname, 'src', 'uploads', subfolder, filename);
        const fileExists = fs.existsSync(filePath);

        res.json({
            success: true,
            filename,
            path: filePath,
            exists: fileExists,
            url: `${req.protocol}://${req.get('host')}/uploads/${subfolder}/${filename}`,
            absolutePath: path.resolve(filePath)
        });
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

// API Routes
app.use('/api/v1', require('./src/routes'));

// In production, serve React app for all other routes
if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(__dirname, 'client/build')));

    app.get('*', (req, res) => {
        // Skip API routes and uploads
        if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) {
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

// Global error handling middleware
app.use((err, req, res, next) => {
    console.error('Global error handler:', err.stack);

    if (err.message === 'Not allowed by CORS') {
        return res.status(403).json({
            success: false,
            message: 'CORS policy violation',
            origin: req.headers.origin
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
  `);
});

process.on('unhandledRejection', (err, promise) => {
    console.log(`Unhandled Rejection: ${err.message}`);
    server.close(() => {
        process.exit(1);
    });
});

module.exports = app;
