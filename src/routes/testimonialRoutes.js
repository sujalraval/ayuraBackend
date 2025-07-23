const express = require('express');
const router = express.Router();
const multer = require('multer');
const {
    getAllTestimonials,
    createTestimonial,
    updateTestimonial,
    deleteTestimonial
} = require('../controllers/testimonialController');

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/testimonials/');
    },
    filename: function (req, file, cb) {
        const uniqueName = `${Date.now()}-${file.originalname}`;
        cb(null, uniqueName);
    }
});

const upload = multer({ storage });

// GET all testimonials
router.get('/', getAllTestimonials);

// POST new testimonial
router.post('/', upload.single('image'), createTestimonial);

// PUT update testimonial
router.put('/:id', upload.single('image'), updateTestimonial);

// DELETE testimonial
router.delete('/:id', deleteTestimonial);

module.exports = router;
