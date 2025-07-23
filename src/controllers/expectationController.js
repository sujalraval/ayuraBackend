const fs = require('fs');
const path = require('path');
const Expectation = require('../models/expectationModel');

exports.getAllExpectations = async (req, res) => {
    const data = await Expectation.find().sort({ createdAt: -1 });
    res.json(data);
};

exports.createExpectation = async (req, res) => {
    try {
        const { title, description } = req.body;
        const image = req.file ? req.file.filename : '';

        const newEntry = await Expectation.create({ title, description, image });
        res.status(201).json(newEntry);
    } catch (err) {
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
            const oldPath = path.join(__dirname, '..', 'uploads', 'expectations', existing.image);
            if (existing.image && fs.existsSync(oldPath)) {
                fs.unlinkSync(oldPath);
            }

            updateData.image = req.file.filename;
        }

        const updated = await Expectation.findByIdAndUpdate(id, updateData, { new: true });
        res.json(updated);
    } catch (err) {
        res.status(500).json({ error: 'Failed to update expectation' });
    }
};

exports.deleteExpectation = async (req, res) => {
    try {
        const { id } = req.params;
        const existing = await Expectation.findById(id);
        if (!existing) return res.status(404).json({ error: 'Not found' });

        if (existing.image) {
            const imagePath = path.join(__dirname, '..', 'uploads', 'expectations', existing.image);
            if (fs.existsSync(imagePath)) {
                fs.unlinkSync(imagePath);
            }
        }

        await existing.deleteOne();
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Failed to delete expectation' });
    }
};
