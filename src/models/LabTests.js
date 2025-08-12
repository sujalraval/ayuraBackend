const mongoose = require('mongoose');

const LabTestSchema = new mongoose.Schema({
    name: { type: String, required: true },
    alias: { type: String },
    category: { type: String },
    description: { type: String },
    parameters: { type: String },
    sample: { type: String },
    fasting: { type: String },
    ageGroup: { type: String },
    gender: { type: String },
    price: { type: Number, required: true },
    marketPrice: { type: Number }, // New field added
    duration: { type: String },
    status: { type: String, default: 'active' },
    collectionType: { type: String },
    whyItIsImportant: { type: String }
}, {
    timestamps: true // Added timestamps for created and updated at
});

module.exports = mongoose.model('LabTest', LabTestSchema);