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

// Get lab tests by category slug
exports.getLabTestsByCategorySlug = async (req, res) => {
    try {
        const slug = req.params.slug;
        console.log('Fetching tests for slug:', slug);

        // First, find the category by slug
        const category = await Category.findOne({ slug });

        if (!category) {
            console.log('Category not found for slug:', slug);
            return res.status(404).json({
                message: "Category not found",
                error: `No category found with slug: ${slug}`
            });
        }

        console.log('Found category:', category.name);

        // Find lab tests that match the category name
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

exports.createLabTest = async (req, res) => {
    try {
        console.log('Received data:', req.body); // Debug log

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

        console.log('Processed data:', testData); // Debug log

        const newTest = new LabTest(testData);
        const savedTest = await newTest.save();

        console.log('Saved test:', savedTest); // Debug log

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
        console.log('Updating with data:', req.body); // Debug log

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

        console.log('Updated test:', updated); // Debug log
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