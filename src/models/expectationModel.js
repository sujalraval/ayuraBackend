const mongoose = require('mongoose');

const expectationSchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: { type: String, required: true },
    image: { type: String, required: true }, // store image filename
}, { timestamps: true });

module.exports = mongoose.model('Expectation', expectationSchema);
