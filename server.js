const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const session = require('express-session');

// Load environment variables FIRST
dotenv.config();

// NOW import passport after env vars are loaded
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

// Update CORS middleware
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


// Explicit OPTIONS handler for all routes
app.options('*', cors({
    origin: allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin', 'Cache-Control', 'X-File-Name']
}));

app.use(morgan('combined')); // HTTP request logger
app.use(express.json({ limit: '10mb' })); // Body parser for JSON
app.use(express.urlencoded({ extended: true, limit: '10mb' })); // Body parser for URL encoded data

// Session configuration with proper production settings
app.use(session({
    secret: process.env.SESSION_SECRET || 'your-fallback-secret',
    resave: false,
    saveUninitialized: false,
    name: 'ayuras.sid', // Custom session name
    cookie: {
        secure: process.env.NODE_ENV === 'production', // HTTPS only in production
        httpOnly: true, // Prevent XSS
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax', // Allow cross-site cookies in production
        domain: process.env.NODE_ENV === 'production' ? '.ayuras.life' : undefined // Share cookies across subdomains
    }
}));

// Passport middleware
app.use(passport.initialize());
app.use(passport.session());

// Serve uploaded images with proper CORS
app.use('/uploads',
    cors({
        origin: allowedOrigins,
        credentials: true
    }),
    express.static('uploads')
);
// Add this before your routes
app.use((req, res, next) => {
    console.log(`Incoming ${req.method} request to ${req.path} from ${req.headers.origin}`);
    next();
});
// API Routes
app.use('/api/v1', require('./src/routes'));

// Welcome route
app.get('/', (req, res) => {
    res.json({
        success: true,
        message: 'Welcome to Ayura Lab Test API - Google OAuth Enabled',
        version: '1.0.0',
        environment: process.env.NODE_ENV,
        cors: {
            allowedOrigins: allowedOrigins
        },
        endpoints: {
            health: '/api/v1/health',
            googleAuth: '/api/v1/auth/google',
            adminAuth: '/api/v1/admin',
        }
    });
});

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

    // CORS error
    if (err.message === 'Not allowed by CORS') {
        return res.status(403).json({
            success: false,
            message: 'CORS policy violation',
            origin: req.headers.origin
        });
    }

    // Mongoose bad ObjectId
    if (err.name === 'CastError') {
        return res.status(404).json({
            success: false,
            message: 'Resource not found'
        });
    }

    // Mongoose validation error
    if (err.name === 'ValidationError') {
        const message = Object.values(err.errors).map(val => val.message).join(', ');
        return res.status(400).json({
            success: false,
            message
        });
    }

    // Mongoose duplicate key error
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
🚀 Ayura Lab Test API Server is running....!!!!
📡 Environment: ${process.env.NODE_ENV}
🌐 Port: ${PORT}
📊 Database: Connected
🔗 API Base URL: http://localhost:${PORT}/api/v1
🔐 Admin API: http://localhost:${PORT}/api/v1/admin
🌍 CORS Origins: ${allowedOrigins.join(', ')}
`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err, promise) => {
    console.log(`Unhandled Rejection: ${err.message}`);
    server.close(() => {
        process.exit(1);
    });
});

module.exports = app;