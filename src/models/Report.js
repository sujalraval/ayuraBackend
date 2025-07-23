const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema({
    appointment: { type: mongoose.Schema.Types.ObjectId, ref: 'Appointment', required: true },
    patient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    testResults: [{
        test: { type: mongoose.Schema.Types.ObjectId, ref: 'Test' },
        value: mongoose.Schema.Types.Mixed,
        unit: String,
        status: { type: String, enum: ['normal', 'high', 'low', 'critical'] },
        notes: String
    }],
    generatedDate: { type: Date, default: Date.now },
    reportUrl: String, // PDF report URL
    reviewed: { type: Boolean, default: false },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

module.exports = mongoose.model('Report', reportSchema);