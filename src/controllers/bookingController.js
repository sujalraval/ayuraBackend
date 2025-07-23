const Booking = require('../models/Booking');
const Test = require('../models/LabTests');

// @desc    Create new booking
// @route   POST /api/v1/bookings
// @access  Private
exports.createBooking = async (req, res) => {
    try {
        const { testId, patientInfo, appointmentDetails, paymentMethod } = req.body;

        // Validate test exists and is active
        const test = await Test.findById(testId);
        if (!test || !test.isActive) {
            return res.status(404).json({
                success: false,
                message: 'Test not found or not available'
            });
        }

        // Check if test is suitable for patient
        if (!test.isAvailableForUser(patientInfo.age, patientInfo.gender)) {
            return res.status(400).json({
                success: false,
                message: 'This test is not suitable for the patient demographics'
            });
        }

        // Check appointment slot availability
        const appointmentDate = new Date(appointmentDetails.date);
        const existingBooking = await Booking.findOne({
            'appointmentDetails.date': {
                $gte: new Date(appointmentDate.setHours(0, 0, 0, 0)),
                $lt: new Date(appointmentDate.setHours(23, 59, 59, 999))
            },
            'appointmentDetails.timeSlot': appointmentDetails.timeSlot,
            'appointmentDetails.address.pincode': appointmentDetails.address.pincode,
            status: { $in: ['pending', 'confirmed'] }
        });

        if (existingBooking) {
            return res.status(400).json({
                success: false,
                message: 'This time slot is already booked for your area'
            });
        }

        // Calculate pricing
        const originalPrice = test.price;
        const discountedPrice = test.discountedPrice;
        const homeCollectionCharge = appointmentDetails.address ? 100 : 0; // ₹100 for home collection
        const totalAmount = (discountedPrice || originalPrice) + homeCollectionCharge;

        // Create booking
        const bookingData = {
            user: req.user.id, // Assuming user is attached to req by auth middleware
            test: testId,
            patientInfo,
            appointmentDetails,
            pricing: {
                originalPrice,
                discountedPrice,
                homeCollectionCharge,
                totalAmount
            },
            paymentMethod,
            status: paymentMethod === 'online' ? 'pending' : 'confirmed'
        };

        const booking = await Booking.create(bookingData);
        await booking.populate('test', 'name category duration reportTime');

        res.status(201).json({
            success: true,
            message: 'Booking created successfully',
            data: booking
        });
    } catch (error) {
        console.error('Create booking error:', error);
        if (error.name === 'ValidationError') {
            const message = Object.values(error.errors).map(val => val.message).join(', ');
            return res.status(400).json({
                success: false,
                message
            });
        }
        res.status(500).json({
            success: false,
            message: 'Server error while creating booking'
        });
    }
};

// @desc    Get user bookings
// @route   GET /api/v1/bookings
// @access  Private
exports.getUserBookings = async (req, res) => {
    try {
        const { status, page = 1, limit = 10 } = req.query;

        let query = { user: req.user.id };
        if (status) {
            query.status = status;
        }

        const bookings = await Booking.find(query)
            .populate('test', 'name category duration reportTime')
            .sort({ createdAt: -1 })
            .limit(parseInt(limit))
            .skip((parseInt(page) - 1) * parseInt(limit));

        const total = await Booking.countDocuments(query);

        res.json({
            success: true,
            count: bookings.length,
            total,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                pages: Math.ceil(total / parseInt(limit))
            },
            data: bookings
        });
    } catch (error) {
        console.error('Get user bookings error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while fetching bookings'
        });
    }
};

// @desc    Get single booking
// @route   GET /api/v1/bookings/:id
// @access  Private
exports.getBooking = async (req, res) => {
    try {
        const booking = await Booking.findById(req.params.id)
            .populate('test', 'name category duration reportTime instructions')
            .populate('technicianAssigned', 'name phone');

        if (!booking) {
            return res.status(404).json({
                success: false,
                message: 'Booking not found'
            });
        }

        // Check if user owns this booking or is admin
        if (booking.user.toString() !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to access this booking'
            });
        }

        res.json({
            success: true,
            data: booking
        });
    } catch (error) {
        console.error('Get booking error:', error);
        if (error.name === 'CastError') {
            return res.status(404).json({
                success: false,
                message: 'Booking not found'
            });
        }
        res.status(500).json({
            success: false,
            message: 'Server error while fetching booking'
        });
    }
};

// @desc    Cancel booking
// @route   PUT /api/v1/bookings/:id/cancel
// @access  Private
exports.cancelBooking = async (req, res) => {
    try {
        const { reason } = req.body;

        const booking = await Booking.findById(req.params.id);

        if (!booking) {
            return res.status(404).json({
                success: false,
                message: 'Booking not found'
            });
        }

        // Check if user owns this booking
        if (booking.user.toString() !== req.user.id) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to cancel this booking'
            });
        }

        // Check if booking can be cancelled
        if (!booking.canBeCancelled()) {
            return res.status(400).json({
                success: false,
                message: 'Booking cannot be cancelled at this time'
            });
        }

        // Calculate refund
        const refundAmount = booking.calculateRefund();

        // Update booking
        booking.status = 'cancelled';
        booking.cancellationReason = reason;
        booking.cancelledAt = new Date();
        if (refundAmount > 0) {
            booking.paymentStatus = 'refunded';
        }

        await booking.save();

        res.json({
            success: true,
            message: 'Booking cancelled successfully',
            data: {
                bookingId: booking.formattedBookingId,
                refundAmount,
                status: booking.status
            }
        });
    } catch (error) {
        console.error('Cancel booking error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while cancelling booking'
        });
    }
};

// @desc    Update booking status (Admin only)
// @route   PUT /api/v1/bookings/:id/status
// @access  Private (Admin only)
exports.updateBookingStatus = async (req, res) => {
    try {
        const { status, technicianId, notes } = req.body;

        const booking = await Booking.findById(req.params.id);

        if (!booking) {
            return res.status(404).json({
                success: false,
                message: 'Booking not found'
            });
        }

        const oldStatus = booking.status;
        booking.status = status;

        // Handle status-specific updates
        switch (status) {
            case 'confirmed':
                if (technicianId) {
                    booking.technicianAssigned = technicianId;
                }
                break;
            case 'sample_collected':
                booking.collectionTime = new Date();
                break;
            case 'completed':
                booking.completedAt = new Date();
                break;
        }

        if (notes) {
            booking.notes = notes;
        }

        await booking.save();

        // TODO: Send notification to user about status update
        // await sendBookingStatusUpdateNotification(booking, oldStatus, status);

        res.json({
            success: true,
            message: `Booking status updated to ${status}`,
            data: {
                bookingId: booking.formattedBookingId,
                status: booking.status,
                updatedAt: booking.updatedAt
            }
        });
    } catch (error) {
        console.error('Update booking status error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while updating booking status'
        });
    }
};

// @desc    Get all bookings (Admin only)
// @route   GET /api/v1/bookings/all
// @access  Private (Admin only)
exports.getAllBookings = async (req, res) => {
    try {
        const {
            status,
            date,
            pincode,
            technicianId,
            page = 1,
            limit = 20
        } = req.query;

        let query = {};

        if (status) query.status = status;
        if (technicianId) query.technicianAssigned = technicianId;
        if (pincode) query['appointmentDetails.address.pincode'] = pincode;

        if (date) {
            const queryDate = new Date(date);
            query['appointmentDetails.date'] = {
                $gte: new Date(queryDate.setHours(0, 0, 0, 0)),
                $lt: new Date(queryDate.setHours(23, 59, 59, 999))
            };
        }

        const bookings = await Booking.find(query)
            .populate('user', 'name email phone')
            .populate('test', 'name category')
            .populate('technicianAssigned', 'name phone')
            .sort({ createdAt: -1 })
            .limit(parseInt(limit))
            .skip((parseInt(page) - 1) * parseInt(limit));

        const total = await Booking.countDocuments(query);

        res.json({
            success: true,
            count: bookings.length,
            total,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                pages: Math.ceil(total / parseInt(limit))
            },
            data: bookings
        });
    } catch (error) {
        console.error('Get all bookings error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while fetching bookings'
        });
    }
};

// @desc    Get available time slots for a date and pincode
// @route   GET /api/v1/bookings/available-slots
// @access  Public
exports.getAvailableSlots = async (req, res) => {
    try {
        const { date, pincode } = req.query;

        if (!date || !pincode) {
            return res.status(400).json({
                success: false,
                message: 'Date and pincode are required'
            });
        }

        const queryDate = new Date(date);

        // Check if date is not in the past
        if (queryDate < new Date().setHours(0, 0, 0, 0)) {
            return res.status(400).json({
                success: false,
                message: 'Cannot book for past dates'
            });
        }

        // Get all booked slots for the date and pincode
        const bookedSlots = await Booking.find({
            'appointmentDetails.date': {
                $gte: new Date(queryDate.setHours(0, 0, 0, 0)),
                $lt: new Date(queryDate.setHours(23, 59, 59, 999))
            },
            'appointmentDetails.address.pincode': pincode,
            status: { $in: ['pending', 'confirmed'] }
        }).distinct('appointmentDetails.timeSlot');

        // All available time slots
        const allSlots = [
            '08:00-09:00', '09:00-10:00', '10:00-11:00', '11:00-12:00',
            '14:00-15:00', '15:00-16:00', '16:00-17:00', '17:00-18:00'
        ];

        const availableSlots = allSlots.filter(slot => !bookedSlots.includes(slot));

        res.json({
            success: true,
            data: {
                date,
                pincode,
                availableSlots,
                bookedSlots
            }
        });
    } catch (error) {
        console.error('Get available slots error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while fetching available slots'
        });
    }
};

// @desc    Get booking statistics
// @route   GET /api/v1/bookings/stats
// @access  Private (Admin only)
exports.getBookingStats = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;

        const stats = await Booking.getBookingStats(
            startDate ? new Date(startDate) : undefined,
            endDate ? new Date(endDate) : undefined
        );

        // Get daily booking trends for the last 30 days
        const dailyStats = await Booking.aggregate([
            {
                $match: {
                    createdAt: {
                        $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
                    }
                }
            },
            {
                $group: {
                    _id: {
                        $dateToString: { format: "%Y-%m-%d", date: "$createdAt" }
                    },
                    bookings: { $sum: 1 },
                    revenue: { $sum: '$pricing.totalAmount' }
                }
            },
            { $sort: { '_id': 1 } }
        ]);

        res.json({
            success: true,
            data: {
                ...stats,
                dailyTrends: dailyStats
            }
        });
    } catch (error) {
        console.error('Get booking stats error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while fetching booking statistics'
        });
    }
};