const fs = require('fs');
const path = require('path');
const Expectation = require('../models/expectationModel');

exports.getAllExpectations = async (req, res) => {
    try {
        const data = await Expectation.find().sort({ createdAt: -1 });

        // Add full URL to image paths
        const expectationsWithFullUrls = data.map(item => ({
            ...item._doc,
            image: item.image ? `${req.protocol}://${req.get('host')}/uploads/expectations/${item.image}` : null
        }));

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
        const newEntry = await Expectation.create({ title, description, image });

        // Return the full URL in the response
        const responseData = {
            ...newEntry._doc,
            image: `${req.protocol}://${req.get('host')}/uploads/expectations/${image}`
        };

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
            // Delete old image if it exists
            if (existing.image) {
                const oldPath = path.join(__dirname, '..', 'uploads', 'expectations', existing.image);
                if (fs.existsSync(oldPath)) {
                    fs.unlinkSync(oldPath);
                }
            }
            updateData.image = req.file.filename;
        }

        const updated = await Expectation.findByIdAndUpdate(id, updateData, { new: true });

        // Return the full URL in the response
        const responseData = {
            ...updated._doc,
            image: updated.image ? `${req.protocol}://${req.get('host')}/uploads/expectations/${updated.image}` : null
        };

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
            }
        }

        await existing.deleteOne();
        res.json({ success: true });
    } catch (err) {
        console.error('Error deleting expectation:', err);
        res.status(500).json({ error: 'Failed to delete expectation' });
    }
};