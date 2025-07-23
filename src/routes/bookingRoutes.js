const express = require('express');
const router = express.Router();
const {
    createBooking,
    getUserBookings,
    getBooking,
    cancelBooking,
    updateBookingStatus,
    getAllBookings,
    getAvailableSlots,
    getBookingStats
} = require('../controllers/bookingController');

// Import auth middleware (uncomment when auth is implemented)
// const { protect, authorize } = require('../middleware/auth');

// @desc    Get available time slots
// @route   GET /api/v1/bookings/available-slots
// @access  Public
router.get('/available-slots', getAvailableSlots);

// @desc    Get booking statistics
// @route   GET /api/v1/bookings/stats
// @access  Private (Admin only)
router.get('/stats', getBookingStats);
// When auth is ready: router.get('/stats', protect, authorize('admin'), getBookingStats);

// @desc    Get all bookings (Admin only)
// @route   GET /api/v1/bookings/all
// @access  Private (Admin only)
router.get('/all', getAllBookings);
// When auth is ready: router.get('/all', protect, authorize('admin'), getAllBookings);

// @desc    Create new booking
// @route   POST /api/v1/bookings
// @access  Private
router.post('/', createBooking);
// When auth is ready: router.post('/', protect, createBooking);

// @desc    Get user bookings
// @route   GET /api/v1/bookings
// @access  Private
router.get('/', getUserBookings);
// When auth is ready: router.get('/', protect, getUserBookings);

// @desc    Get single booking
// @route   GET /api/v1/bookings/:id
// @access  Private
router.get('/:id', getBooking);
// When auth is ready: router.get('/:id', protect, getBooking);

// @desc    Cancel booking
// @route   PUT /api/v1/bookings/:id/cancel
// @access  Private
router.put('/:id/cancel', cancelBooking);
// When auth is ready: router.put('/:id/cancel', protect, cancelBooking);

// @desc    Update booking status (Admin only)
// @route   PUT /api/v1/bookings/:id/status
// @access  Private (Admin only)
router.put('/:id/status', updateBookingStatus);
// When auth is ready: router.put('/:id/status', protect, authorize('admin'), updateBookingStatus);

module.exports = router;