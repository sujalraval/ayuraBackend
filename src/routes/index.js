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

// Health check route
router.get('/health', (req, res) => {
    res.status(200).json({
        success: true,
        message: 'Ayura Lab Test API is healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        version: '1.0.0'
    });
});

// Main entry route - REMOVE THIS since it conflicts with server.js root route
// The server.js already handles the root '/' route

// Route mounting
router.use('/auth', authRoutes);
router.use('/bookings', bookingRoutes);
router.use('/lab-tests', labTestRoutes);
router.use('/categories', categoryRoutes);
router.use('/cart', cartRoutes);
router.use('/why-choose', whyChooseRoutes);
router.use('/popular-tests', popularTestRoutes);
router.use('/expectations', expectationRoutes);
router.use('/testimonials', testimonialRoutes);
router.use('/orders', orderRoutes);
router.use('/admin', adminRoutes);

module.exports = router;