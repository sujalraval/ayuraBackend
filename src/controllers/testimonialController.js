const fs = require('fs');
const Testimonial = require('../models/Testimonial');
const { getImageUrl, getFilePath, verifyFileExists, deleteFile } = require('../utils/fileUtils');

exports.getAllTestimonials = async (req, res) => {
    try {
        const data = await Testimonial.find().sort({ createdAt: -1 });

        const testimonialsWithFullUrls = data.map(item => {
            let imageUrl = null;

            if (item.image) {
                const imagePath = getFilePath(item.image, 'testimonials');
                if (verifyFileExists(imagePath)) {
                    imageUrl = getImageUrl(req, item.image, 'testimonials');
                } else {
                    console.warn(`Image file not found for testimonial ${item._id}: ${imagePath}`);
                }
            }

            return {
                ...item._doc,
                image: imageUrl
            };
        });

        console.log('Fetched testimonials with URLs:', testimonialsWithFullUrls.map(item => ({
            id: item._id,
            name: item.name,
            imageUrl: item.image
        })));

        res.json({
            success: true,
            data: testimonialsWithFullUrls
        });
    } catch (err) {
        console.error('Error fetching testimonials:', err);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch testimonials',
            message: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
        });
    }
};

exports.createTestimonial = async (req, res) => {
    try {
        const { name, rating, comment, location } = req.body;

        // Validate required fields
        if (!name || !rating || !comment) {
            return res.status(400).json({
                success: false,
                error: 'Name, rating, and comment are required'
            });
        }

        // Validate rating range
        if (rating < 1 || rating > 5) {
            return res.status(400).json({
                success: false,
                error: 'Rating must be between 1 and 5'
            });
        }

        let image = null;

        if (req.file) {
            image = req.file.filename;
            console.log('Creating testimonial with image:', image);
            console.log('File saved at:', req.file.path);

            // Verify file was actually saved
            if (!verifyFileExists(req.file.path)) {
                return res.status(500).json({
                    success: false,
                    error: 'File upload failed - file not found after save'
                });
            }
        }

        const newTestimonial = await Testimonial.create({
            name,
            rating: Number(rating),
            comment,
            location,
            image
        });

        // Return the full URL in the response
        const responseData = {
            ...newTestimonial._doc,
            image: image ? getImageUrl(req, image, 'testimonials') : null
        };

        console.log('Created testimonial with URL:', responseData.image);

        res.status(201).json({
            success: true,
            data: responseData,
            message: 'Testimonial created successfully'
        });
    } catch (err) {
        console.error('Error creating testimonial:', err);

        // Clean up uploaded file if database save failed
        if (req.file && req.file.path) {
            deleteFile(req.file.path);
        }

        res.status(500).json({
            success: false,
            error: 'Failed to create testimonial',
            message: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
        });
    }
};

exports.updateTestimonial = async (req, res) => {
    try {
        const { id } = req.params;

        // Validate ObjectId
        if (!id.match(/^[0-9a-fA-F]{24}$/)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid testimonial ID'
            });
        }

        const existing = await Testimonial.findById(id);

        if (!existing) {
            return res.status(404).json({
                success: false,
                error: 'Testimonial not found'
            });
        }

        const { name, rating, comment, location } = req.body;
        const updateData = {};

        // Only update fields that are provided
        if (name !== undefined) updateData.name = name;
        if (rating !== undefined) {
            // Validate rating range
            if (rating < 1 || rating > 5) {
                return res.status(400).json({
                    success: false,
                    error: 'Rating must be between 1 and 5'
                });
            }
            updateData.rating = Number(rating);
        }
        if (comment !== undefined) updateData.comment = comment;
        if (location !== undefined) updateData.location = location;

        if (req.file) {
            console.log('Updating with new image:', req.file.filename);

            // Delete old image if it exists
            if (existing.image) {
                const oldPath = getFilePath(existing.image, 'testimonials');
                deleteFile(oldPath);
            }

            updateData.image = req.file.filename;
        }

        const updated = await Testimonial.findByIdAndUpdate(id, updateData, {
            new: true,
            runValidators: true
        });

        // Return the full URL in the response
        const responseData = {
            ...updated._doc,
            image: updated.image ? getImageUrl(req, updated.image, 'testimonials') : null
        };

        console.log('Updated testimonial with URL:', responseData.image);

        res.json({
            success: true,
            data: responseData,
            message: 'Testimonial updated successfully'
        });
    } catch (err) {
        console.error('Error updating testimonial:', err);

        // Clean up uploaded file if update failed
        if (req.file && req.file.path) {
            deleteFile(req.file.path);
        }

        res.status(500).json({
            success: false,
            error: 'Failed to update testimonial',
            message: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
        });
    }
};

exports.deleteTestimonial = async (req, res) => {
    try {
        const { id } = req.params;

        // Validate ObjectId
        if (!id.match(/^[0-9a-fA-F]{24}$/)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid testimonial ID'
            });
        }

        const existing = await Testimonial.findById(id);

        if (!existing) {
            return res.status(404).json({
                success: false,
                error: 'Testimonial not found'
            });
        }

        // Delete the associated image file
        if (existing.image) {
            const imagePath = getFilePath(existing.image, 'testimonials');
            deleteFile(imagePath);
        }

        await existing.deleteOne();
        console.log('Deleted testimonial:', id);

        res.json({
            success: true,
            message: 'Testimonial deleted successfully'
        });
    } catch (err) {
        console.error('Error deleting testimonial:', err);
        res.status(500).json({
            success: false,
            error: 'Failed to delete testimonial',
            message: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
        });
    }
};

// Optional: Get single testimonial by ID
exports.getTestimonialById = async (req, res) => {
    try {
        const { id } = req.params;

        if (!id.match(/^[0-9a-fA-F]{24}$/)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid testimonial ID'
            });
        }

        const testimonial = await Testimonial.findById(id);

        if (!testimonial) {
            return res.status(404).json({
                success: false,
                error: 'Testimonial not found'
            });
        }

        let imageUrl = null;
        if (testimonial.image) {
            const imagePath = getFilePath(testimonial.image, 'testimonials');
            if (verifyFileExists(imagePath)) {
                imageUrl = getImageUrl(req, testimonial.image, 'testimonials');
            }
        }

        const responseData = {
            ...testimonial._doc,
            image: imageUrl
        };

        res.json({
            success: true,
            data: responseData
        });
    } catch (err) {
        console.error('Error fetching testimonial:', err);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch testimonial'
        });
    }
};

// Optional: Verify image endpoint for testimonials
exports.verifyImage = async (req, res) => {
    try {
        const { filename } = req.params;
        const imagePath = getFilePath(filename, 'testimonials');

        if (verifyFileExists(imagePath)) {
            const stats = fs.statSync(imagePath);
            res.json({
                success: true,
                filename,
                path: imagePath,
                size: stats.size,
                url: getImageUrl(req, filename, 'testimonials'),
                accessible: true
            });
        } else {
            res.status(404).json({
                success: false,
                filename,
                path: imagePath,
                accessible: false,
                error: 'Image file not found'
            });
        }
    } catch (err) {
        console.error('Error verifying image:', err);
        res.status(500).json({
            success: false,
            error: 'Failed to verify image'
        });
    }
};
