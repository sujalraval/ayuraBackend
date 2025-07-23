const mongoose = require('mongoose');

const CartSchema = new mongoose.Schema({
    userId: {
        type: String,
        required: true,
        index: true
    },
    items: [
        {
            testId: {
                type: mongoose.Schema.Types.ObjectId,
                required: true
            },
            name: {
                type: String,
                required: true
            },
            price: {
                type: Number,
                required: true
            },
            description: String,
            category: String,
            quantity: {
                type: Number,
                default: 1,
                min: 1
            }
        }
    ]
}, {
    timestamps: true,
    // Add index for better query performance
    collection: 'carts'
});

// Index for faster queries
CartSchema.index({ userId: 1 });
CartSchema.index({ 'items.testId': 1 });

module.exports = mongoose.model('Cart', CartSchema);
