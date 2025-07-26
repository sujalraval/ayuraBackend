const mongoose = require('mongoose');

const LabTestSchema = new mongoose.Schema({
    name: { type: String, required: true },
    alias: { type: String },
    category: { type: String }, // Changed from required: true to optional
    description: { type: String },
    parameters: { type: String },
    sample: { type: String },
    fasting: { type: String },
    ageGroup: { type: String },
    gender: { type: String },
    price: { type: Number, required: true },
    duration: { type: String },
    status: { type: String, default: 'active' }
});

module.exports = mongoose.model('LabTest', LabTestSchema);