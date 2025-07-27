const Order = require('../models/Order');
const Cart = require('../models/Cart');
const { sendApprovalEmail, sendReportUploadEmail } = require('../utils/emailService');
const { validateOrder } = require('../utils/validation');
const { getImageUrl, getFilePath, verifyFileExists, deleteFile } = require('../utils/fileUtils');
const mongoose = require('mongoose');

/**
 * @desc Place a new order
 * @route POST /api/orders/place
 * @access Private
 */
exports.placeOrder = async (req, res) => {
    try {
        console.log('=== PLACE ORDER REQUEST ===');
        console.log('Received order data:', JSON.stringify(req.body, null, 2));

        const { userId, patientInfo, cartItems, totalPrice, paymentMethod } = req.body;

        // Validate required fields
        if (!patientInfo || !cartItems || !totalPrice) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields: patientInfo, cartItems, totalPrice'
            });
        }

        // Validate order data if validation function exists
        if (validateOrder) {
            const { error } = validateOrder(req.body);
            if (error) {
                console.error('Validation error:', error.details);
                return res.status(400).json({
                    success: false,
                    message: 'Validation failed',
                    error: error.details[0].message
                });
            }
        }

        // Ensure all cart items have valid testIds
        const processedCartItems = cartItems.map(item => ({
            testId: mongoose.Types.ObjectId.isValid(item.testId)
                ? new mongoose.Types.ObjectId(item.testId)
                : new mongoose.Types.ObjectId(),
            testName: item.testName,
            lab: item.lab,
            price: Number(item.price)
        }));

        // Use consistent user identification
        const currentUserId = req.user?.id || req.user?._id || userId;
        const currentUserEmail = req.user?.email || patientInfo.email;

        console.log('Processing order with user:', {
            currentUserId,
            currentUserEmail,
            patientEmail: patientInfo.email
        });

        // Create new order with consistent userId format
        const newOrder = new Order({
            patientInfo: {
                ...patientInfo,
                email: patientInfo.email || currentUserEmail,
                userId: currentUserId,
                userEmail: currentUserEmail
            },
            cartItems: processedCartItems,
            totalPrice: Number(totalPrice),
            paymentMethod: paymentMethod || 'COD',
            status: 'pending',
            paymentStatus: paymentMethod === 'COD' ? 'Pending' : 'Paid'
        });

        console.log('Order object before save:', {
            status: newOrder.status,
            patientName: newOrder.patientInfo.name,
            itemsCount: newOrder.cartItems.length,
            totalPrice: newOrder.totalPrice
        });

        // Save order to database
        const savedOrder = await newOrder.save();

        console.log('✅ Order saved successfully:', {
            id: savedOrder._id,
            status: savedOrder.status,
            createdAt: savedOrder.createdAt
        });

        // Clear user's cart
        try {
            if (currentUserId) {
                await Cart.findOneAndDelete({ userId: currentUserId });
                console.log('✅ Cart cleared for user:', currentUserId);
            }
        } catch (cartError) {
            console.log('⚠️ Cart clear error (non-critical):', cartError.message);
        }

        res.status(201).json({
            success: true,
            message: 'Order placed successfully',
            orderId: savedOrder._id,
            order: savedOrder
        });

    } catch (error) {
        console.error('❌ Order placement failed:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to place order',
            error: error.message
        });
    }
};

/**
 * @desc Get all pending orders (for admin)
 * @route GET /api/orders/pending
 * @access Private/Admin
 */
exports.getPendingOrders = async (req, res) => {
    try {
        const orders = await Order.find({
            status: { $regex: /^pending$/i }
        })
            .sort({ createdAt: -1 })
            .lean();

        const totalOrders = await Order.countDocuments();
        const statusCounts = await Order.aggregate([
            { $group: { _id: '$status', count: { $sum: 1 } } }
        ]);

        res.json({
            success: true,
            count: orders.length,
            orders,
            debug: {
                totalOrdersInDB: totalOrders,
                statusCounts
            }
        });

    } catch (error) {
        console.error('Error fetching pending orders:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching pending orders',
            error: error.message
        });
    }
};

/**
 * @desc Get all orders (admin only)
 * @route GET /api/orders/all
 * @access Private/Admin
 */
exports.getAllOrders = async (req, res) => {
    try {
        const filter = {};

        if (req.query.status) {
            filter.status = { $regex: new RegExp(req.query.status, 'i') };
        }

        if (req.query.startDate && req.query.endDate) {
            filter.createdAt = {
                $gte: new Date(req.query.startDate),
                $lte: new Date(req.query.endDate)
            };
        }

        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;

        const orders = await Order.find(filter)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean();

        const total = await Order.countDocuments(filter);

        res.json({
            success: true,
            count: orders.length,
            total,
            page,
            pages: Math.ceil(total / limit),
            orders
        });

    } catch (error) {
        console.error('Error fetching all orders:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching all orders',
            error: error.message
        });
    }
};

/**
 * @desc Approve an order
 * @route PUT /api/orders/approve/:orderId
 * @access Private/Admin
 */
exports.approveOrder = async (req, res) => {
    try {
        authDebug(req, 'APPROVE ORDER');
        console.log('=== APPROVE ORDER REQUEST ===');
        console.log('Order ID:', req.params.orderId);

        if (!mongoose.Types.ObjectId.isValid(req.params.orderId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid order ID format'
            });
        }

        const order = await Order.findByIdAndUpdate(
            req.params.orderId,
            {
                status: 'approved',
                technicianNotes: req.body.notes || 'Order approved by admin',
                updatedAt: Date.now()
            },
            { new: true, runValidators: true }
        );

        if (!order) {
            console.log('❌ Order not found:', req.params.orderId);
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        console.log('✅ Order approved:', {
            id: order._id,
            status: order.status,
            patientEmail: order.patientInfo?.email
        });

        // Send approval email to patient if email service is available
        if (order.patientInfo.email && order.patientInfo.timeSlot) {
            try {
                await sendApprovalEmail(order.patientInfo.email, order.patientInfo.timeSlot);
                console.log('✅ Approval email sent');
            } catch (emailError) {
                console.log('⚠️ Email sending failed (non-critical):', emailError.message);
            }
        }

        res.json({
            success: true,
            message: 'Order approved successfully',
            order
        });

    } catch (error) {
        console.error('❌ Approve error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to approve order',
            error: error.message
        });
    }
};


/**
 * @desc Deny an order
 * @route PUT /api/orders/deny/:orderId
 * @access Private/Admin
 */
exports.denyOrder = async (req, res) => {
    try {
        authDebug(req, 'DENY ORDER');
        console.log('=== DENY ORDER REQUEST ===');
        console.log('Order ID:', req.params.orderId);

        if (!mongoose.Types.ObjectId.isValid(req.params.orderId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid order ID format'
            });
        }

        const order = await Order.findByIdAndUpdate(
            req.params.orderId,
            {
                status: 'denied',
                technicianNotes: req.body.notes || 'Order was denied',
                updatedAt: Date.now()
            },
            { new: true, runValidators: true }
        );

        if (!order) {
            console.log('❌ Order not found:', req.params.orderId);
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        console.log('✅ Order denied:', {
            id: order._id,
            status: order.status
        });

        res.json({
            success: true,
            message: 'Order denied successfully',
            order
        });

    } catch (error) {
        console.error('❌ Deny error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to deny order',
            error: error.message
        });
    }
};

/**
 * @desc Get all working orders (not pending)
 * @route GET /api/orders/working
 * @access Private/Admin
 */
exports.getWorkingOrders = async (req, res) => {
    try {
        const orders = await Order.find({
            status: { $ne: 'pending' }
        })
            .sort({ createdAt: -1 })
            .lean();

        res.status(200).json({
            success: true,
            count: orders.length,
            orders
        });

    } catch (error) {
        console.error('Error fetching working orders:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch working orders',
            error: error.message
        });
    }
};

/**
 * @desc Upload report for an order
 * @route POST /api/orders/upload-report/:id
 * @access Private/Admin
 */
exports.uploadReport = async (req, res) => {
    try {
        console.log('=== UPLOAD REPORT REQUEST ===');
        console.log('Order ID:', req.params.id);
        console.log('File uploaded:', req.file ? req.file.filename : 'No file');

        // Validate order ID format
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid order ID format'
            });
        }

        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'No report file uploaded'
            });
        }

        const orderId = req.params.id;
        const filename = req.file.filename;

        console.log('File saved at:', req.file.path);
        console.log('Generated filename:', filename);

        // Verify file was actually saved
        if (!verifyFileExists(req.file.path)) {
            return res.status(500).json({
                success: false,
                message: 'File upload failed - file not found after save'
            });
        }

        // Generate the report URL using utility function
        const reportUrl = getImageUrl(req, filename, 'reports');

        console.log('Generated report URL:', reportUrl);

        const updatedOrder = await Order.findByIdAndUpdate(
            orderId,
            {
                status: 'report submitted',
                reportUrl: reportUrl,
                reportFilename: filename, // Store filename for future operations
                updatedAt: Date.now()
            },
            { new: true, runValidators: true }
        );

        if (!updatedOrder) {
            // Delete the uploaded file if order not found
            const filePath = getFilePath(filename, 'reports');
            deleteFile(filePath);

            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        console.log('✅ Order updated with report:', {
            id: updatedOrder._id,
            status: updatedOrder.status,
            reportUrl: updatedOrder.reportUrl
        });

        // Send email notification
        try {
            if (updatedOrder.patientInfo.email) {
                await sendReportUploadEmail({
                    patientName: updatedOrder.patientInfo.name,
                    patientEmail: updatedOrder.patientInfo.email,
                    reportUrl: reportUrl
                });
                console.log('✅ Report upload email sent');
            }
        } catch (emailError) {
            console.error('⚠️ Email sending failed (non-critical):', emailError.message);
            // Continue even if email fails
        }

        // Emit real-time update if socket.io is available
        if (req.app.get('io')) {
            req.app.get('io').emit('orderUpdate', {
                orderId: updatedOrder._id,
                status: updatedOrder.status,
                reportUrl: updatedOrder.reportUrl
            });
        }

        res.status(200).json({
            success: true,
            message: 'Report uploaded successfully',
            data: {
                order: updatedOrder,
                reportUrl: reportUrl,
                filename: filename
            }
        });

    } catch (error) {
        console.error('❌ Upload report error:', error);

        // Clean up the uploaded file if error occurs
        if (req.file) {
            const filePath = getFilePath(req.file.filename, 'reports');
            deleteFile(filePath);
        }

        res.status(500).json({
            success: false,
            message: 'Failed to upload report',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
};

/**
 * @desc Get user's orders
 * @route GET /api/orders/user
 * @access Private
 */
exports.getUserOrders = async (req, res) => {
    try {
        const { email, memberId, userId } = req.query;

        let query = {};

        if (userId) {
            query['patientInfo.userId'] = userId;
        } else if (memberId) {
            query['patientInfo.memberId'] = memberId;
        } else if (email) {
            query['patientInfo.email'] = email;
        } else {
            const userEmail = req.user?.email;
            const userUserId = req.user?.id || req.user?._id;

            if (userUserId) {
                query['patientInfo.userId'] = userUserId;
            } else if (userEmail) {
                query['patientInfo.email'] = userEmail;
            } else {
                return res.status(400).json({
                    success: false,
                    message: 'No user identifier found'
                });
            }
        }

        const orders = await Order.find(query)
            .sort({ createdAt: -1 })
            .lean();

        res.status(200).json({
            success: true,
            count: orders.length,
            orders
        });

    } catch (error) {
        console.error('Error fetching user orders:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching orders',
            error: error.message
        });
    }
};

/**
 * @desc Get order by ID
 * @route GET /api/orders/:id
 * @access Private
 */
exports.getOrderById = async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid order ID format'
            });
        }

        const order = await Order.findById(req.params.id).lean();

        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        // Check if user is authorized to view this order
        const userEmail = req.user?.email;
        const userId = req.user?.id || req.user?._id;
        const isAdmin = req.user?.isAdmin || req.user?.role === 'admin' || req.user?.role === 'labtech';

        const canAccess = isAdmin ||
            order.patientInfo.email === userEmail ||
            order.patientInfo.userId === userId ||
            order.patientInfo.userEmail === userEmail;

        if (!canAccess) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to view this order'
            });
        }

        res.json({
            success: true,
            order
        });

    } catch (error) {
        console.error('Error fetching order:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching order',
            error: error.message
        });
    }
};

/**
 * @desc Update order status
 * @route PUT /api/orders/:id/status
 * @access Private/Admin
 */
exports.updateOrderStatus = async (req, res) => {
    try {
        console.log('=== UPDATE ORDER STATUS REQUEST ===');
        console.log('Order ID:', req.params.id);
        console.log('Request body:', req.body);

        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid order ID format'
            });
        }

        const { status, notes } = req.body;

        const validStatuses = [
            'pending', 'approved', 'denied', 'sample collected',
            'processing', 'report submitted', 'completed', 'cancelled'
        ];

        if (status && !validStatuses.includes(status.toLowerCase())) {
            return res.status(400).json({
                success: false,
                message: 'Invalid status provided',
                validStatuses
            });
        }

        const updateData = {};
        if (status) updateData.status = status.toLowerCase();
        if (notes) updateData.technicianNotes = notes;

        const order = await Order.findByIdAndUpdate(
            req.params.id,
            updateData,
            { new: true, runValidators: true }
        );

        if (!order) {
            console.log('❌ Order not found:', req.params.id);
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        console.log('✅ Order status updated:', {
            id: order._id,
            status: order.status,
            notes: order.technicianNotes
        });

        // Emit event for real-time update
        if (req.app.get('io')) {
            req.app.get('io').emit('orderUpdate', {
                orderId: order._id,
                status: order.status,
                reportUrl: order.reportUrl
            });
        }

        res.json({
            success: true,
            message: 'Order status updated successfully',
            order
        });

    } catch (error) {
        console.error('❌ Update order status error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update order status',
            error: error.message
        });
    }
};

/**
 * @desc Cancel an order
 * @route PUT /api/orders/:id/cancel
 * @access Private
 */
exports.cancelOrder = async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid order ID format'
            });
        }

        const order = await Order.findById(req.params.id);

        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        // Check if user is authorized to cancel this order
        const userEmail = req.user?.email;
        const userId = req.user?.id || req.user?._id;

        const canCancel = order.patientInfo.email === userEmail ||
            order.patientInfo.userId === userId ||
            order.patientInfo.userEmail === userEmail;

        if (!canCancel) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to cancel this order'
            });
        }

        // Check if order can be cancelled
        if (order.status !== 'pending') {
            return res.status(400).json({
                success: false,
                message: 'Order cannot be cancelled at this stage'
            });
        }

        order.status = 'cancelled';
        order.technicianNotes = 'Cancelled by user';
        await order.save();

        res.json({
            success: true,
            message: 'Order cancelled successfully',
            order
        });

    } catch (error) {
        console.error('Error cancelling order:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to cancel order',
            error: error.message
        });
    }
};

/**
 * @desc Get family members from orders
 * @route GET /api/orders/family-members
 * @access Private
 */
exports.getFamilyMembers = async (req, res) => {
    try {
        console.log('Request user:', req.user);

        const userId = req.user?.id || req.user?._id || req.user?.userId;
        const userEmail = req.user?.email;

        console.log('Extracted userId:', userId);
        console.log('Extracted userEmail:', userEmail);

        if (!userId && !userEmail) {
            console.log('No user identifier found');
            return res.status(401).json({
                success: false,
                message: 'Unauthorized: no user identifier found'
            });
        }

        let query = {
            'patientInfo.relation': { $ne: 'self' },
            $or: []
        };

        if (userId) {
            query.$or.push({ 'patientInfo.userId': userId });
            query.$or.push({ 'patientInfo.userId': userId.toString() });
        }

        if (userEmail) {
            query.$or.push({ 'patientInfo.userEmail': userEmail });
            query.$or.push({ 'patientInfo.email': userEmail });
            query.$or.push({ 'patientInfo.userId': userEmail });
        }

        console.log('Query:', JSON.stringify(query, null, 2));

        const orders = await Order.find(query).sort({ createdAt: -1 });

        console.log('Fetched orders count:', orders.length);

        const membersMap = new Map();

        orders.forEach((order, index) => {
            const patientInfo = order.patientInfo || {};
            const { name, relation, age, gender, memberId, email, phone } = patientInfo;

            console.log(`Processing order ${index + 1}:`, { name, relation, age, gender, memberId });

            const uniqueKey = memberId || `${name}_${relation}_${email || 'no-email'}`;

            if (!name) {
                console.log('Skipping order - missing name');
                return;
            }

            if (!membersMap.has(uniqueKey)) {
                membersMap.set(uniqueKey, {
                    id: uniqueKey,
                    memberId: memberId || null,
                    name,
                    relation: relation || 'family',
                    age: age || 'N/A',
                    gender: gender || 'N/A',
                    email: email || 'N/A',
                    phone: phone || 'N/A',
                    userId: userId || userEmail,
                    lastCheckup: order.createdAt,
                    orderCount: 1,
                    tests: [{
                        orderId: order._id,
                        name: order.cartItems?.map(i => i.testName).join(', ') || 'Unknown Test',
                        lab: order.cartItems?.[0]?.lab || 'Unknown Lab',
                        date: order.createdAt,
                        status: order.status || 'Unknown',
                        totalPrice: order.totalPrice || 0
                    }]
                });
            } else {
                const member = membersMap.get(uniqueKey);
                member.orderCount++;
                member.tests.push({
                    orderId: order._id,
                    name: order.cartItems?.map(i => i.testName).join(', ') || 'Unknown Test',
                    lab: order.cartItems?.[0]?.lab || 'Unknown Lab',
                    date: order.createdAt,
                    status: order.status || 'Unknown',
                    totalPrice: order.totalPrice || 0
                });

                if (order.createdAt > member.lastCheckup) {
                    member.lastCheckup = order.createdAt;
                }
            }
        });

        const members = Array.from(membersMap.values());

        console.log('Final members count:', members.length);

        res.status(200).json({
            success: true,
            members: members
        });

    } catch (error) {
        console.error('Error fetching family members:', error);
        res.status(500).json({
            success: false,
            message: 'Server error fetching family members',
            error: error.message
        });
    }
};
