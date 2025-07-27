const mongoose = require('mongoose');

const expectationSchema = new mongoose.Schema({
    title: {
        type: String,
        required: [true, 'Title is required'],
        trim: true,
        maxlength: [1000, 'Title cannot exceed 1000 characters']
    },
    description: {
        type: String,
        required: [true, 'Description is required'],
        trim: true,
        maxlength: [10000, 'Description cannot exceed 10000 characters']
    },
    image: {
        type: String,
        required: [true, 'Image is required']
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

module.exports = mongoose.model('Expectation', expectationSchema);