const mongoose = require('mongoose');

const whyChooseSchema = new mongoose.Schema({
    icon: {
        type: String,
        required: true,
        trim: true
    },
    title: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        required: true,
        trim: true
    },
}, {
    timestamps: true
});

const WhyChoose = mongoose.model('WhyChoose', whyChooseSchema);

module.exports = WhyChoose;