const express = require('express');
const router = express.Router();
const WhyChoose = require('../models/WhyChoose');

// Get all why choose items (user side)
router.get('/', async (req, res) => {
    try {
        const items = await WhyChoose.find().sort({ createdAt: -1 });
        res.json(items);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Admin - Get all items
router.get('/all', async (req, res) => {
    try {
        const items = await WhyChoose.find().sort({ createdAt: -1 });
        res.json(items);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Admin - Create new item
router.post('/', async (req, res) => {
    const item = new WhyChoose({
        icon: req.body.icon,
        title: req.body.title,
        description: req.body.description
    });

    try {
        const newItem = await item.save();
        res.status(201).json(newItem);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// Admin - Update item
router.put('/:id', async (req, res) => {
    try {
        const updatedItem = await WhyChoose.findByIdAndUpdate(
            req.params.id,
            {
                icon: req.body.icon,
                title: req.body.title,
                description: req.body.description
            },
            { new: true }
        );
        res.json(updatedItem);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// Admin - Delete item
router.delete('/:id', async (req, res) => {
    try {
        await WhyChoose.findByIdAndDelete(req.params.id);
        res.json({ message: 'Item deleted successfully' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
