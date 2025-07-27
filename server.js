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

// ENHANCED Static files middleware - THIS IS THE KEY FIX
app.use('/uploads', express.static(path.join(__dirname, 'uploads'), {
    maxAge: '1d',
    etag: false,
    setHeaders: (res, filePath) => {
        // Set proper headers for different file types
        const ext = path.extname(filePath).toLowerCase();

        if (ext === '.png') {
            res.set('Content-Type', 'image/png');
        } else if (ext === '.jpg' || ext === '.jpeg') {
            res.set('Content-Type', 'image/jpeg');
        } else if (ext === '.gif') {
            res.set('Content-Type', 'image/gif');
        }

        // Enable CORS for all origins
        res.set('Access-Control-Allow-Origin', '*');
        res.set('Access-Control-Allow-Methods', 'GET');
        res.set('Cross-Origin-Resource-Policy', 'cross-origin');

        // Prevent caching issues
        res.set('Cache-Control', 'public, max-age=86400');

        console.log('Serving static file:', filePath, 'Content-Type:', res.get('Content-Type'));
    }
}));

// Directory verification function
const verifyUploadsDirectory = () => {
    const uploadsPath = path.join(__dirname, 'uploads');
    const expectationsPath = path.join(uploadsPath, 'expectations');

    console.log('=== UPLOADS DIRECTORY VERIFICATION ===');
    console.log('Server directory:', __dirname);
    console.log('Uploads path:', uploadsPath);
    console.log('Uploads exists:', fs.existsSync(uploadsPath));
    console.log('Expectations path:', expectationsPath);
    console.log('Expectations exists:', fs.existsSync(expectationsPath));

    // Create directories if they don't exist
    if (!fs.existsSync(uploadsPath)) {
        fs.mkdirSync(uploadsPath, { recursive: true });
        console.log('Created uploads directory');
    }

    if (!fs.existsSync(expectationsPath)) {
        fs.mkdirSync(expectationsPath, { recursive: true });
        console.log('Created expectations directory');
    }

    if (fs.existsSync(expectationsPath)) {
        const files = fs.readdirSync(expectationsPath);
        console.log('Files in expectations folder:', files.length);
        console.log('Sample files:', files.slice(0, 5));

        // Check specific file if it exists
        const targetFile = '1753604347973-63268070.png';
        const targetPath = path.join(expectationsPath, targetFile);
        console.log(`Target file (${targetFile}) exists:`, fs.existsSync(targetPath));

        if (fs.existsSync(targetPath)) {
            const stats = fs.statSync(targetPath);
            console.log('File size:', stats.size, 'bytes');
            console.log('File permissions:', stats.mode.toString(8));
        }
    }
    console.log('=== END VERIFICATION ===');
};

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

// EMERGENCY DIRECT IMAGE SERVING ROUTE - Add this before API routes
app.get('/uploads/expectations/:filename', (req, res) => {
    const filename = req.params.filename;
    const imagePath = path.join(__dirname, 'uploads', 'expectations', filename);

    console.log('Direct image request for:', filename);
    console.log('Full path:', imagePath);
    console.log('File exists:', fs.existsSync(imagePath));

    if (fs.existsSync(imagePath)) {
        const stat = fs.statSync(imagePath);
        const ext = path.extname(filename).toLowerCase();

        let contentType = 'application/octet-stream';
        if (ext === '.png') contentType = 'image/png';
        else if (ext === '.jpg' || ext === '.jpeg') contentType = 'image/jpeg';
        else if (ext === '.gif') contentType = 'image/gif';

        res.setHeader('Content-Type', contentType);
        res.setHeader('Content-Length', stat.size);
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Cache-Control', 'public, max-age=86400');

        console.log('Serving image with headers:', {
            'Content-Type': contentType,
            'Content-Length': stat.size
        });

        const stream = fs.createReadStream(imagePath);
        stream.pipe(res);
    } else {
        console.log('Image not found:', imagePath);
        res.status(404).json({ error: 'Image not found', path: imagePath });
    }
});

// Test route for debugging
app.get('/test-image/:filename', (req, res) => {
    const filename = req.params.filename;
    const imagePath = path.join(__dirname, 'uploads', 'expectations', filename);

    console.log('Testing image access:', imagePath);
    console.log('File exists:', fs.existsSync(imagePath));

    if (fs.existsSync(imagePath)) {
        res.sendFile(imagePath);
    } else {
        res.status(404).json({ error: 'File not found', path: imagePath });
    }
});

// API Routes
app.use('/api/v1', require('./src/routes'));

// Debug route to check uploads directory
app.get('/debug/uploads', (req, res) => {
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
            expectationFiles: expectationFiles.slice(0, 10)
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

    // Verify uploads directory on startup
    verifyUploadsDirectory();
});

process.on('unhandledRejection', (err, promise) => {
    console.log(`Unhandled Rejection: ${err.message}`);
    server.close(() => {
        process.exit(1);
    });
});

module.exports = app;
