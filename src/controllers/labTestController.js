const LabTest = require('../models/LabTests');
const Category = require('../models/Categories');

// Get all lab tests
exports.getAllLabTests = async (req, res) => {
    try {
        const tests = await LabTest.find();
        res.json(tests);
    } catch (err) {
        console.error('Error fetching all lab tests:', err);
        res.status(500).json({ error: 'Failed to fetch lab tests' });
    }
};

// Get a single lab test by ID - NEW FUNCTION
exports.getLabTestById = async (req, res) => {
    try {
        const { id } = req.params;

        console.log('Fetching test by ID:', id);

        const test = await LabTest.findById(id);

        if (!test) {
            console.log('Test not found for ID:', id);
            return res.status(404).json({
                success: false,
                message: 'Test not found',
                error: `No test found with ID: ${id}`
            });
        }

        console.log('Found test:', test.name);

        res.json({
            success: true,
            data: test
        });
    } catch (error) {
        console.error('Error fetching test by ID:', error);

        if (error.name === 'CastError') {
            return res.status(400).json({
                success: false,
                message: 'Invalid test ID format',
                error: 'The provided ID is not a valid MongoDB ObjectId'
            });
        }

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
        console.log('Fetching tests for slug:', slug);

        const category = await Category.findOne({ slug });

        if (!category) {
            console.log('Category not found for slug:', slug);
            return res.status(404).json({
                message: "Category not found",
                error: `No category found with slug: ${slug}`
            });
        }

        console.log('Found category:', category.name);

        const tests = await LabTest.find({
            category: {
                $regex: new RegExp(`^${category.name}$`, 'i')
            }
        });

        console.log('Found tests count:', tests.length);
        return res.json(tests);

    } catch (err) {
        console.error('Error fetching lab tests by category slug:', err);
        return res.status(500).json({
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
        });
        res.json(tests);
    } catch (err) {
        console.error('Error fetching uncategorized lab tests:', err);
        res.status(500).json({
            error: 'Failed to fetch uncategorized lab tests',
            message: err.message
        });
    }
};

// Create lab test
exports.createLabTest = async (req, res) => {
    try {
        console.log('Received data:', req.body);

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
            duration: req.body.duration,
            status: req.body.status || 'active',
            collectionType: req.body.collectionType,
            whyItIsImportant: req.body.whyItIsImportant
        };

        console.log('Processed data:', testData);

        const newTest = new LabTest(testData);
        const savedTest = await newTest.save();

        console.log('Saved test:', savedTest);

        res.status(201).json(savedTest);
    } catch (err) {
        console.error('Error creating lab test:', err);
        res.status(400).json({
            error: 'Failed to create lab test',
            message: err.message
        });
    }
};

// Update a lab test
exports.updateLabTest = async (req, res) => {
    try {
        console.log('Updating with data:', req.body);

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
            return res.status(404).json({ error: 'Lab test not found' });
        }

        console.log('Updated test:', updated);
        res.json(updated);
    } catch (err) {
        console.error('Error updating lab test:', err);
        res.status(400).json({
            error: 'Failed to update lab test',
            message: err.message
        });
    }
};

// Delete a lab test
exports.deleteLabTest = async (req, res) => {
    try {
        const deleted = await LabTest.findByIdAndDelete(req.params.id);

        if (!deleted) {
            return res.status(404).json({ error: 'Lab test not found' });
        }

        res.json({ message: 'Lab test deleted successfully' });
    } catch (err) {
        console.error('Error deleting lab test:', err);
        res.status(400).json({
            error: 'Failed to delete lab test',
            message: err.message
        });
    }
};

// Search lab tests by name, alias, category, description, or parameters
exports.searchLabTests = async (req, res) => {
    try {
        const { query } = req.query;

        if (!query || query.trim().length === 0) {
            return res.json([]);
        }

        const searchRegex = new RegExp(query.trim(), 'i');

        const tests = await LabTest.find({
            $or: [
                { name: { $regex: searchRegex } },
                { alias: { $regex: searchRegex } },
                { category: { $regex: searchRegex } },
                { description: { $regex: searchRegex } },
                { parameters: { $regex: searchRegex } }
            ]
        }).limit(10);

        res.json(tests);
    } catch (err) {
        console.error('Error searching lab tests:', err);
        res.status(500).json({ error: 'Failed to search lab tests' });
    }
};
