const mongoose = require('mongoose');

const OrderSchema = new mongoose.Schema({
    patientInfo: {
        name: { type: String, required: true },
        email: { type: String, required: true },
        phone: { type: String, required: true },
        dob: String,
        gender: String,
        relation: { type: String, default: 'self' },
        timeSlot: String,
        memberId: String,
        userId: { type: String, required: true },
        userEmail: String,  // ✅ Backup email
        address: String,
        city: String,
        state: String,
        pincode: String,
    },

    cartItems: [{
        testName: { type: String, required: true },
        lab: { type: String, required: true },
        price: { type: Number, required: true },
        testId: { type: mongoose.Schema.Types.ObjectId, required: true }
    }],

    totalPrice: { type: Number, required: true },

    paymentMethod: {
        type: String,
        default: 'COD',
        enum: ['COD', 'Online', 'Wallet']
    },

    status: {
        type: String,
        default: 'pending',
        enum: [
            'pending',
            'approved',
            'denied',
            'sample collected',
            'processing',
            'report submitted',
            'completed',
            'cancelled'
        ]
    },

    reportUrl: String,
    technicianNotes: String,
    labNotes: String,

    paymentStatus: {
        type: String,
        default: 'Pending',
        enum: ['Pending', 'Paid', 'Failed', 'Refunded']
    },

    transactionId: String,

    // ✅ NEW FIELDS FOR DENIAL LOGGING
    deniedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'AdminUser'
    },
    deniedAt: {
        type: Date
    }

}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// ✅ Virtual for formatted date
OrderSchema.virtual('formattedDate').get(function () {
    return this.createdAt.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
});

// ✅ Indexes for better performance
OrderSchema.index({ 'patientInfo.email': 1 });
OrderSchema.index({ 'patientInfo.userId': 1 });
OrderSchema.index({ 'patientInfo.userEmail': 1 });
OrderSchema.index({ 'patientInfo.memberId': 1 });
OrderSchema.index({ status: 1 });
OrderSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Order', OrderSchema);
