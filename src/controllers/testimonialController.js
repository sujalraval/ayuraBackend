const Testimonial = require('../models/Testimonial');

exports.getAllTestimonials = async (req, res) => {
    try {
        const data = await Testimonial.find();
        res.json(data);
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
};

exports.createTestimonial = async (req, res) => {
    try {
        const newTestimonial = new Testimonial({
            name: req.body.name,
            rating: req.body.rating,
            comment: req.body.comment,
            location: req.body.location,
            image: req.file ? `/uploads/testimonials/${req.file.filename}` : null
        });
        const saved = await newTestimonial.save();
        res.json(saved);
    } catch (err) {
        res.status(400).json({ message: 'Creation failed' });
    }
};

exports.updateTestimonial = async (req, res) => {
    try {
        const updatedFields = {
            name: req.body.name,
            rating: req.body.rating,
            comment: req.body.comment,
            location: req.body.location
        };
        if (req.file) {
            updatedFields.image = `/uploads/testimonials/${req.file.filename}`;
        }

        const updated = await Testimonial.findByIdAndUpdate(req.params.id, updatedFields, { new: true });
        res.json(updated);
    } catch (err) {
        res.status(400).json({ message: 'Update failed' });
    }
};

exports.deleteTestimonial = async (req, res) => {
    try {
        await Testimonial.findByIdAndDelete(req.params.id);
        res.json({ success: true });
    } catch (err) {
        res.status(400).json({ message: 'Delete failed' });
    }
};
