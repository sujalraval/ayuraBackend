const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const session = require('express-session');
const path = require('path');

// Load environment variables FIRST
dotenv.config();

// Import passport after env vars are loaded
const passport = require('./src/config/passport');
const connectDB = require('./src/config/database');

// Connect to database
connectDB();

const app = express();

// Trust proxy for production (important for HTTPS)
app.set('trust proxy', 1);

// Update allowedOrigins to include your production domains
const allowedOrigins = [
    'https://admin.ayuras.life',
    'https://www.admin.ayuras.life',
    'http://localhost:5173',
    'http://localhost:5174',
    'https://ayuras.life'
];

// Enhanced CORS middleware
app.use(cors({
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps, Postman) or if origin is allowed
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

// Handle preflight requests
app.options('*', cors());

// Static files middleware - MOVED UP BEFORE OTHER MIDDLEWARE
app.use('/uploads', express.static(path.join(__dirname, 'uploads'), {
    maxAge: '1d',
    etag: false,
    setHeaders: (res, path) => {
        res.set('Cross-Origin-Resource-Policy', 'cross-origin');
        res.set('Access-Control-Allow-Origin', '*');
    }
}));

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

// Serve static files from React app if in production
if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(__dirname, 'client/build')));
}

// Log incoming requests
app.use((req, res, next) => {
    console.log(`Incoming ${req.method} request to ${req.path} from ${req.headers.origin}`);
    next();
});

// API Routes
app.use('/api/v1', require('./src/routes'));

// Debug route to check uploads directory
app.get('/debug/uploads', (req, res) => {
    const fs = require('fs');
    const uploadsPath = path.join(__dirname, 'uploads');

    try {
        const stats = fs.statSync(uploadsPath);
        const expectationsPath = path.join(uploadsPath, 'expectations');
        const expectationsExists = fs.existsSync(expectationsPath);
        let expectationFiles = [];

        if (expectationsExists) {
            expectationFiles = fs.readdirSync(expectationsPath);
        }

        res.json({
            uploadsPath,
            exists: stats.isDirectory(),
            expectationsPath,
            expectationsExists,
            expectationFiles: expectationFiles.slice(0, 10) // Show first 10 files
        });
    } catch (error) {
        res.json({
            uploadsPath,
            exists: false,
            error: error.message
        });
    }
});

// In production, serve React app for all other routes
if (process.env.NODE_ENV === 'production') {
    app.get('*', (req, res) => {
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

    if (err.name === 'CastError') {
        return res.status(404).json({
            success: false,
            message: 'Resource not found'
        });
    }

    if (err.name === 'ValidationError') {
        const message = Object.values(err.errors).map(val => val.message).join(', ');
        return res.status(400).json({
            success: false,
            message
        });
    }

    if (err.code === 11000) {
        return res.status(400).json({
            success: false,
            message: 'Duplicate field value entered'
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
📁 Static files: ${path.join(__dirname, 'uploads')}
`);
});

process.on('unhandledRejection', (err, promise) => {
    console.log(`Unhandled Rejection: ${err.message}`);
    server.close(() => {
        process.exit(1);
    });
});

module.exports = app;