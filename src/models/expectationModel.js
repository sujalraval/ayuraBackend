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

// Virtual to convert filename to URL (optional - for additional flexibility)
expectationSchema.virtual('imageUrl').get(function () {
    if (this.image && !this.image.startsWith('http')) {
        return `https://ayuras.life/uploads/expectations/${this.image}`;
    }
    return this.image;
});

// Optional: Transform function to always return URL in JSON
// Uncomment if you want automatic URL conversion at model level
/*
expectationSchema.set('toJSON', {
    transform: function(doc, ret) {
        if (ret.image && !ret.image.startsWith('http')) {
            ret.image = `https://ayuras.life/uploads/expectations/${ret.image}`;
        }
        return ret;
    }
});
*/

module.exports = mongoose.model('Expectation', expectationSchema);
