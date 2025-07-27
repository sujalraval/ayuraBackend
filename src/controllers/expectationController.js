const fs = require('fs');
const Expectation = require('../models/expectationModel');
const { getImageUrl, getFilePath, verifyFileExists, deleteFile } = require('../utils/fileUtils');

exports.getAllExpectations = async (req, res) => {
    try {
        const data = await Expectation.find().sort({ createdAt: -1 });

        const expectationsWithFullUrls = data.map(item => {
            let imageUrl = null;

            if (item.image) {
                const imagePath = getFilePath(item.image, 'expectations');
                console.log(`Checking image for expectation ${item._id}: ${item.image}`);
                console.log(`Full path: ${imagePath}`);

                if (verifyFileExists(imagePath)) {
                    imageUrl = getImageUrl(req, item.image, 'expectations');
                    console.log(`Generated URL: ${imageUrl}`);
                } else {
                    console.warn(`Image file not found for expectation ${item._id}: ${imagePath}`);
                    // Optionally update database to remove missing image reference
                    // item.image = null;
                    // item.save();
                }
            }

            return {
                ...item._doc,
                image: imageUrl
            };
        });

        console.log('Fetched expectations with URLs:', expectationsWithFullUrls.map(item => ({
            id: item._id,
            title: item.title,
            imageUrl: item.image,
            hasImage: !!item.image
        })));

        res.json({
            success: true,
            data: expectationsWithFullUrls
        });
    } catch (err) {
        console.error('Error fetching expectations:', err);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch expectations',
            message: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
        });
    }
};

exports.createExpectation = async (req, res) => {
    try {
        const { title, description } = req.body;

        // Validate required fields
        if (!title || !description) {
            return res.status(400).json({
                success: false,
                error: 'Title and description are required'
            });
        }

        if (!req.file) {
            return res.status(400).json({
                success: false,
                error: 'Image is required'
            });
        }

        const image = req.file.filename;

        console.log('Creating expectation with image:', image);
        console.log('File saved at:', req.file.path);
        console.log('File size:', req.file.size);

        // Verify file was actually saved
        if (!verifyFileExists(req.file.path)) {
            return res.status(500).json({
                success: false,
                error: 'File upload failed - file not found after save'
            });
        }

        const newEntry = await Expectation.create({ title, description, image });

        // Return the full URL in the response
        const imageUrl = getImageUrl(req, image, 'expectations');
        const responseData = {
            ...newEntry._doc,
            image: imageUrl
        };

        console.log('Created expectation with URL:', imageUrl);

        res.status(201).json({
            success: true,
            data: responseData,
            message: 'Expectation created successfully'
        });
    } catch (err) {
        console.error('Error creating expectation:', err);

        // Clean up uploaded file if database save failed
        if (req.file && req.file.path) {
            deleteFile(req.file.path);
        }

        res.status(500).json({
            success: false,
            error: 'Failed to create expectation',
            message: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
        });
    }
};

exports.updateExpectation = async (req, res) => {
    try {
        const { id } = req.params;

        // Validate ObjectId
        if (!id.match(/^[0-9a-fA-F]{24}$/)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid expectation ID'
            });
        }

        const existing = await Expectation.findById(id);

        if (!existing) {
            return res.status(404).json({
                success: false,
                error: 'Expectation not found'
            });
        }

        const { title, description } = req.body;
        const updateData = {};

        // Only update fields that are provided
        if (title !== undefined) updateData.title = title;
        if (description !== undefined) updateData.description = description;

        if (req.file) {
            console.log('Updating with new image:', req.file.filename);

            // Delete old image if it exists
            if (existing.image) {
                const oldPath = getFilePath(existing.image, 'expectations');
                deleteFile(oldPath);
            }

            updateData.image = req.file.filename;
        }

        const updated = await Expectation.findByIdAndUpdate(id, updateData, {
            new: true,
            runValidators: true
        });

        // Return the full URL in the response
        const imageUrl = updated.image ? getImageUrl(req, updated.image, 'expectations') : null;
        const responseData = {
            ...updated._doc,
            image: imageUrl
        };

        console.log('Updated expectation with URL:', imageUrl);

        res.json({
            success: true,
            data: responseData,
            message: 'Expectation updated successfully'
        });
    } catch (err) {
        console.error('Error updating expectation:', err);

        // Clean up uploaded file if update failed
        if (req.file && req.file.path) {
            deleteFile(req.file.path);
        }

        res.status(500).json({
            success: false,
            error: 'Failed to update expectation',
            message: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
        });
    }
};

exports.deleteExpectation = async (req, res) => {
    try {
        const { id } = req.params;

        // Validate ObjectId
        if (!id.match(/^[0-9a-fA-F]{24}$/)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid expectation ID'
            });
        }

        const existing = await Expectation.findById(id);

        if (!existing) {
            return res.status(404).json({
                success: false,
                error: 'Expectation not found'
            });
        }

        // Delete the associated image file
        if (existing.image) {
            const imagePath = getFilePath(existing.image, 'expectations');
            deleteFile(imagePath);
        }

        await existing.deleteOne();
        console.log('Deleted expectation:', id);

        res.json({
            success: true,
            message: 'Expectation deleted successfully'
        });
    } catch (err) {
        console.error('Error deleting expectation:', err);
        res.status(500).json({
            success: false,
            error: 'Failed to delete expectation',
            message: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
        });
    }
};

// Debug endpoint to check file status
exports.verifyImage = async (req, res) => {
    try {
        const { filename } = req.params;
        const imagePath = getFilePath(filename, 'expectations');

        if (verifyFileExists(imagePath)) {
            const stats = fs.statSync(imagePath);
            const imageUrl = getImageUrl(req, filename, 'expectations');

            res.json({
                success: true,
                filename,
                path: imagePath,
                size: stats.size,
                url: imageUrl,
                accessible: true,
                createdAt: stats.birthtime,
                modifiedAt: stats.mtime
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
