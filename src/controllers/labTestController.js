const mongoose = require('mongoose');
const LabTest = require('../models/LabTests');
const Category = require('../models/Categories');

// Get all lab tests
exports.getAllLabTests = async (req, res) => {
    try {
        const tests = await LabTest.find().sort({ createdAt: -1 });
        res.json(tests);
    } catch (err) {
        console.error('Error fetching all lab tests:', err);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch lab tests',
            message: err.message
        });
    }
};

// Get a single lab test by ID
exports.getLabTestById = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid test ID format',
                error: 'The provided ID is not a valid MongoDB ObjectId'
            });
        }

        const test = await LabTest.findById(id);

        if (!test) {
            return res.status(404).json({
                success: false,
                message: 'Test not found',
                error: `No test found with ID: ${id}`
            });
        }

        res.json({
            success: true,
            data: test
        });
    } catch (error) {
        console.error('Error fetching test by ID:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
};

// Get lab tests by category slug
exports.getLabTestsByCategorySlug = async (req, res) => {
    try {
        const slug = req.params.slug;
        const category = await Category.findOne({ slug });

        if (!category) {
            return res.status(404).json({
                success: false,
                message: "Category not found",
                error: `No category found with slug: ${slug}`
            });
        }

        const tests = await LabTest.find({
            category: {
                $regex: new RegExp(`^${category.name}$`, 'i')
            }
        }).sort({ name: 1 });

        return res.json({
            success: true,
            data: tests
        });

    } catch (err) {
        console.error('Error fetching lab tests by category slug:', err);
        return res.status(500).json({
            success: false,
            message: "Server error",
            error: err.message
        });
    }
};

// Get uncategorized lab tests
exports.getUncategorizedLabTests = async (req, res) => {
    try {
        const tests = await LabTest.find({
            $or: [
                { category: { $exists: false } },
                { category: null },
                { category: '' }
            ]
        }).sort({ name: 1 });

        res.json({
            success: true,
            data: tests
        });
    } catch (err) {
        console.error('Error fetching uncategorized lab tests:', err);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch uncategorized lab tests',
            message: err.message
        });
    }
};

// Create lab test
exports.createLabTest = async (req, res) => {
    try {
        const testData = {
            name: req.body.name,
            alias: req.body.alias,
            category: req.body.category,
            description: req.body.description,
            parameters: req.body.parameters,
            sample: req.body.sample,
            fasting: req.body.fasting,
            ageGroup: req.body.ageGroup,
            gender: req.body.gender,
            price: req.body.price,
            marketPrice: req.body.marketPrice, // Added new field
            duration: req.body.duration,
            status: req.body.status || 'active',
            collectionType: req.body.collectionType,
            whyItIsImportant: req.body.whyItIsImportant
        };

        // Validate required fields
        if (!testData.name || !testData.price) {
            return res.status(400).json({
                success: false,
                message: 'Name and price are required fields'
            });
        }

        const newTest = new LabTest(testData);
        const savedTest = await newTest.save();

        res.status(201).json({
            success: true,
            data: savedTest
        });
    } catch (err) {
        console.error('Error creating lab test:', err);
        res.status(400).json({
            success: false,
            error: 'Failed to create lab test',
            message: err.message
        });
    }
};

// Update a lab test
exports.updateLabTest = async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid test ID format'
            });
        }

        const updateData = {
            name: req.body.name,
            alias: req.body.alias,
            category: req.body.category,
            description: req.body.description,
            parameters: req.body.parameters,
            sample: req.body.sample,
            fasting: req.body.fasting,
            ageGroup: req.body.ageGroup,
            gender: req.body.gender,
            price: req.body.price,
            marketPrice: req.body.marketPrice, // Added new field
            duration: req.body.duration,
            status: req.body.status,
            collectionType: req.body.collectionType,
            whyItIsImportant: req.body.whyItIsImportant
        };

        const updated = await LabTest.findByIdAndUpdate(
            req.params.id,
            updateData,
            { new: true, runValidators: true }
        );

        if (!updated) {
            return res.status(404).json({
                success: false,
                error: 'Lab test not found'
            });
        }

        res.json({
            success: true,
            data: updated
        });
    } catch (err) {
        console.error('Error updating lab test:', err);
        res.status(400).json({
            success: false,
            error: 'Failed to update lab test',
            message: err.message
        });
    }
};

// Delete a lab test
exports.deleteLabTest = async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid test ID format'
            });
        }

        const deleted = await LabTest.findByIdAndDelete(req.params.id);

        if (!deleted) {
            return res.status(404).json({
                success: false,
                error: 'Lab test not found'
            });
        }

        res.json({
            success: true,
            message: 'Lab test deleted successfully',
            data: deleted
        });
    } catch (err) {
        console.error('Error deleting lab test:', err);
        res.status(400).json({
            success: false,
            error: 'Failed to delete lab test',
            message: err.message
        });
    }
};

// Search lab tests
exports.searchLabTests = async (req, res) => {
    try {
        const { name, alias, category, description, parameters, q } = req.query;

        // If 'q' parameter exists, use it as a general search term
        if (q) {
            const searchRegex = new RegExp(q, 'i');
            const tests = await LabTest.find({
                $or: [
                    { name: searchRegex },
                    { alias: searchRegex },
                    { category: searchRegex },
                    { description: searchRegex },
                    { parameters: searchRegex }
                ]
            }).sort({ name: 1 });

            return res.json({
                success: true,
                data: tests
            });
        }

        // Build dynamic query object for specific field searches
        const query = {};
        if (name) query.name = { $regex: name, $options: 'i' };
        if (alias) query.alias = { $regex: alias, $options: 'i' };
        if (category) query.category = { $regex: category, $options: 'i' };
        if (description) query.description = { $regex: description, $options: 'i' };
        if (parameters) query.parameters = { $regex: parameters, $options: 'i' };

        const tests = await LabTest.find(query).sort({ name: 1 });

        res.json({
            success: true,
            data: tests
        });
    } catch (err) {
        console.error('Error searching lab tests:', err);
        res.status(500).json({
            success: false,
            error: 'Failed to search lab tests',
            message: err.message
        });
    }
};