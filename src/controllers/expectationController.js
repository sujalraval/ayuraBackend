const fs = require('fs');
const path = require('path');
const Expectation = require('../models/expectationModel');

// Helper function to generate full image URL
const getImageUrl = (req, filename) => {
    if (!filename) return null;

    // Use the actual host from request
    const protocol = req.secure || req.headers['x-forwarded-proto'] === 'https' ? 'https' : 'http';
    const host = req.get('host');

    return `${protocol}://${host}/uploads/expectations/${filename}`;
};

exports.getAllExpectations = async (req, res) => {
    try {
        const data = await Expectation.find().sort({ createdAt: -1 });

        // Add full URL to image paths with proper URL construction
        const expectationsWithFullUrls = data.map(item => ({
            ...item._doc,
            image: getImageUrl(req, item.image)
        }));

        console.log('Fetched expectations with URLs:', expectationsWithFullUrls.map(item => ({
            id: item._id,
            title: item.title,
            imageUrl: item.image
        })));

        res.json(expectationsWithFullUrls);
    } catch (err) {
        console.error('Error fetching expectations:', err);
        res.status(500).json({ error: 'Failed to fetch expectations' });
    }
};

exports.createExpectation = async (req, res) => {
    try {
        const { title, description } = req.body;

        if (!req.file) {
            return res.status(400).json({ error: 'Image is required' });
        }

        const image = req.file.filename;
        console.log('Creating expectation with image:', image);
        console.log('File saved at:', req.file.path);

        const newEntry = await Expectation.create({ title, description, image });

        // Return the full URL in the response
        const responseData = {
            ...newEntry._doc,
            image: getImageUrl(req, image)
        };

        console.log('Created expectation with URL:', responseData.image);
        res.status(201).json(responseData);
    } catch (err) {
        console.error('Error creating expectation:', err);
        res.status(500).json({ error: 'Failed to create expectation' });
    }
};

exports.updateExpectation = async (req, res) => {
    try {
        const { id } = req.params;
        const existing = await Expectation.findById(id);
        if (!existing) return res.status(404).json({ error: 'Not found' });

        const { title, description } = req.body;
        const updateData = { title, description };

        if (req.file) {
            console.log('Updating with new image:', req.file.filename);

            // Delete old image if it exists
            if (existing.image) {
                const oldPath = path.join(__dirname, '..', 'uploads', 'expectations', existing.image);
                if (fs.existsSync(oldPath)) {
                    fs.unlinkSync(oldPath);
                    console.log('Deleted old image:', oldPath);
                }
            }
            updateData.image = req.file.filename;
        }

        const updated = await Expectation.findByIdAndUpdate(id, updateData, { new: true });

        // Return the full URL in the response
        const responseData = {
            ...updated._doc,
            image: getImageUrl(req, updated.image)
        };

        console.log('Updated expectation with URL:', responseData.image);
        res.json(responseData);
    } catch (err) {
        console.error('Error updating expectation:', err);
        res.status(500).json({ error: 'Failed to update expectation' });
    }
};

exports.deleteExpectation = async (req, res) => {
    try {
        const { id } = req.params;
        const existing = await Expectation.findById(id);
        if (!existing) return res.status(404).json({ error: 'Not found' });

        // Delete the associated image file
        if (existing.image) {
            const imagePath = path.join(__dirname, '..', 'uploads', 'expectations', existing.image);
            if (fs.existsSync(imagePath)) {
                fs.unlinkSync(imagePath);
                console.log('Deleted image file:', imagePath);
            }
        }

        await existing.deleteOne();
        console.log('Deleted expectation:', id);
        res.json({ success: true });
    } catch (err) {
        console.error('Error deleting expectation:', err);
        res.status(500).json({ error: 'Failed to delete expectation' });
    }
};