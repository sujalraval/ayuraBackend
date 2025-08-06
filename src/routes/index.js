const express = require('express');
const router = express.Router();

// Route imports
const authRoutes = require('./authRoutes');
const bookingRoutes = require('./bookingRoutes');
const labTestRoutes = require('./labTestRoutes');
const categoryRoutes = require('./categories');
const cartRoutes = require('./cartRoutes');
const whyChooseRoutes = require('./whyChoose');
const popularTestRoutes = require('./popularTestRoutes');
const expectationRoutes = require('./expectationRoutes');
const testimonialRoutes = require('./testimonialRoutes');
const orderRoutes = require('./orderRoutes');
const adminRoutes = require('./adminRoutes');

// Health check route with enhanced info
router.get('/health', (req, res) => {
    res.status(200).json({
        success: true,
        message: 'Ayura Lab Test API is healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        version: '1.0.0',
        environment: process.env.NODE_ENV || 'development',
    });
});


// Route mounting with proper order (most specific first)
router.use('/admin', adminRoutes);        // Admin routes first
router.use('/auth', authRoutes);          // User authentication
router.use('/orders', orderRoutes);       // Order management
router.use('/bookings', bookingRoutes);   // Booking system
router.use('/lab-tests', labTestRoutes);  // Lab tests
router.use('/categories', categoryRoutes); // Test categories
router.use('/cart', cartRoutes);          // Shopping cart
router.use('/why-choose', whyChooseRoutes); // Why choose content
router.use('/popular-tests', popularTestRoutes); // Popular tests
router.use('/expectations', expectationRoutes);   // Expectations content
router.use('/testimonials', testimonialRoutes);   // Testimonials

// Catch-all for undefined API routes
router.use('*', (req, res) => {
    res.status(404).json({
        success: false,
        message: `API route ${req.originalUrl} not found`,
    });
});

module.exports = router;
