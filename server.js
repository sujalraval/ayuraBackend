const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const helmet = require('helmet');
const session = require('express-session');
const morgan = require('morgan');
const path = require('path');
const fs = require('fs');

// Load environment variables
dotenv.config();

const app = express();
app.set('trust proxy', 1);

// Logger
const logger = {
    info: (message) => console.log(`[INFO] ${new Date().toISOString()} - ${message}`),
    error: (message) => console.error(`[ERROR] ${new Date().toISOString()} - ${message}`)
};

// Configure CORS
const allowedOrigins = [
    'http://localhost:5173',
    'http://localhost:5174',
    'https://admin.ayuras.life',
    'https://ayuras.life'
];

app.use(cors({
    origin: function (origin, callback) {
        if (!origin) return callback(null, true);
        if (allowedOrigins.includes(origin)) return callback(null, true);

        logger.error(`CORS request from blocked origin: ${origin}`);
        return callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    exposedHeaders: ['Authorization']
}));

// Security middleware
app.use(helmet());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(morgan('dev'));

// Session configuration
app.use(session({
    secret: process.env.SESSION_SECRET || 'your-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000,
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
    }
}));

// Routes
const router = express.Router();

// Order approval endpoint
router.put('/orders/:action/:orderId', async (req, res) => {
    try {
        const { action, orderId } = req.params;
        const { adminNotes, actionTimestamp } = req.body;

        if (!['approve', 'deny'].includes(action)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid action'
            });
        }

        // Validate required fields
        if (!adminNotes || !actionTimestamp) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields'
            });
        }

        // Here you would typically:
        // 1. Verify the admin token
        // 2. Find the order in database
        // 3. Update the order status
        // 4. Log the action

        // Mock implementation - replace with your actual database logic
        logger.info(`Order ${orderId} ${action}ed by admin`);

        return res.json({
            success: true,
            message: `Order ${action}d successfully`,
            orderId,
            newStatus: action === 'approve' ? 'approved' : 'denied'
        });

    } catch (error) {
        logger.error(`Error processing order action: ${error.message}`);
        return res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// Apply routes
app.use('/api/v1', router);

// Error handling middleware
app.use((err, req, res, next) => {
    logger.error(err.stack);
    res.status(500).json({
        success: false,
        message: process.env.NODE_ENV === 'production' ? 'Server Error' : err.message
    });
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    logger.info(`Server running on port ${PORT}`);
});