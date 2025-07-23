const PopularTest = require('../models/PopularTest');
const LabTest = require('../models/LabTests');

// Get all popular tests (for public)
exports.getAllPopularTests = async (req, res) => {
    try {
        const popularTests = await PopularTest.find()
            .populate('labTest')
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            data: popularTests
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching popular tests',
            error: error.message
        });
    }
};

// Get all for admin (includes everything)
exports.getPopularTestsForAdmin = async (req, res) => {
    try {
        const popularTests = await PopularTest.find()
            .populate('labTest')
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            data: popularTests
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching popular tests',
            error: error.message
        });
    }
};

// Get by ID
exports.getPopularTestById = async (req, res) => {
    try {
        const popularTest = await PopularTest.findById(req.params.id).populate('labTest');

        if (!popularTest) {
            return res.status(404).json({
                success: false,
                message: 'Popular test not found'
            });
        }

        res.status(200).json({
            success: true,
            data: popularTest
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching popular test',
            error: error.message
        });
    }
};

// Create
exports.createPopularTest = async (req, res) => {
    try {
        const { labTest, badge } = req.body;

        const existingLabTest = await LabTest.findById(labTest);
        if (!existingLabTest) {
            return res.status(404).json({
                success: false,
                message: 'Lab test not found'
            });
        }

        const existingPopularTest = await PopularTest.findOne({ labTest });
        if (existingPopularTest) {
            return res.status(400).json({
                success: false,
                message: 'This lab test is already in popular tests'
            });
        }

        const popularTest = new PopularTest({ labTest, badge });
        await popularTest.save();
        await popularTest.populate('labTest');

        res.status(201).json({
            success: true,
            data: popularTest,
            message: 'Popular test created successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error creating popular test',
            error: error.message
        });
    }
};

// Update
exports.updatePopularTest = async (req, res) => {
    try {
        const { labTest, badge } = req.body;

        const popularTest = await PopularTest.findById(req.params.id);
        if (!popularTest) {
            return res.status(404).json({
                success: false,
                message: 'Popular test not found'
            });
        }

        if (labTest && labTest !== popularTest.labTest.toString()) {
            const existingLabTest = await LabTest.findById(labTest);
            if (!existingLabTest) {
                return res.status(404).json({
                    success: false,
                    message: 'Lab test not found'
                });
            }

            const existingPopularTest = await PopularTest.findOne({ labTest });
            if (existingPopularTest) {
                return res.status(400).json({
                    success: false,
                    message: 'This lab test is already in popular tests'
                });
            }

            popularTest.labTest = labTest;
        }

        if (badge !== undefined) popularTest.badge = badge;

        await popularTest.save();
        await popularTest.populate('labTest');

        res.status(200).json({
            success: true,
            data: popularTest,
            message: 'Popular test updated successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error updating popular test',
            error: error.message
        });
    }
};

// Delete
exports.deletePopularTest = async (req, res) => {
    try {
        const popularTest = await PopularTest.findById(req.params.id);
        if (!popularTest) {
            return res.status(404).json({
                success: false,
                message: 'Popular test not found'
            });
        }

        await PopularTest.findByIdAndDelete(req.params.id);

        res.status(200).json({
            success: true,
            message: 'Popular test deleted successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error deleting popular test',
            error: error.message
        });
    }
};
// Get available lab tests for selection
exports.getAvailableLabTests = async (req, res) => {
    try {
        const popularTestIds = await PopularTest.distinct('labTest');

        const availableTests = await LabTest.find({
            _id: { $nin: popularTestIds }  // removed status filter
        }).select('name alias category price');

        res.status(200).json({
            success: true,
            data: availableTests
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching available lab tests',
            error: error.message
        });
    }
};

