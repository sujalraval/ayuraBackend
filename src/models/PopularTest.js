const mongoose = require('mongoose');

const popularTestSchema = new mongoose.Schema({
    labTest: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'LabTest',
        required: true
    },
    badge: {
        type: String,
        enum: ['Popular', 'Bestseller', 'Trending', 'New'],
        default: null
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

popularTestSchema.pre('save', function (next) {
    this.updatedAt = Date.now();
    next();
});

popularTestSchema.index({ labTest: 1 }, { unique: true });

module.exports = mongoose.model('PopularTest', popularTestSchema);
