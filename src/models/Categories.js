const mongoose = require('mongoose');

const CategorySchema = new mongoose.Schema({
    name: { type: String, required: true },
    description: { type: String, required: true },
    icon: { type: String, required: true },
    slug: { type: String, required: true, unique: true }
});

module.exports = mongoose.model('Category', CategorySchema);