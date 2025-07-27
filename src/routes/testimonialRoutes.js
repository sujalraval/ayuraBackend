const express = require('express');
const router = express.Router();
const upload = require('../config/multerConfig'); // Use centralized multer config
const {
    getAllTestimonials,
    createTestimonial,
    updateTestimonial,
    deleteTestimonial,
    getTestimonialById,
    verifyImage
} = require('../controllers/testimonialController');

// GET all testimonials
router.get('/', getAllTestimonials);

// GET single testimonial by ID
router.get('/:id', getTestimonialById);

// POST new testimonial
router.post('/', upload.single('image'), createTestimonial);

// PUT update testimonial
router.put('/:id', upload.single('image'), updateTestimonial);

// DELETE testimonial
router.delete('/:id', deleteTestimonial);

// Optional: Verify image accessibility (for debugging)
router.get('/verify-image/:filename', verifyImage);

module.exports = router;
