const mongoose = require('mongoose');

const testimonialSchema = new mongoose.Schema({
    name: { type: String, required: true },
    rating: { type: Number, required: true },
    comment: { type: String, required: true },
    location: { type: String, required: true },
    image: { type: String, default: null },
});

module.exports = mongoose.model('Testimonial', testimonialSchema);
