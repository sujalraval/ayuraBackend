const express = require('express');
const router = express.Router();

const {
    getAllPopularTests,
    getPopularTestsForAdmin,
    getPopularTestById,
    createPopularTest,
    updatePopularTest,
    deletePopularTest,
    getAvailableLabTests
} = require('../controllers/popularTestController');

// Public routes
router.get('/public', getAllPopularTests);

// Admin routes
router.get('/admin', getPopularTestsForAdmin);
router.get('/available-tests', getAvailableLabTests);
router.get('/:id', getPopularTestById);
router.post('/', createPopularTest);
router.put('/:id', updatePopularTest);
router.delete('/:id', deletePopularTest);

module.exports = router;
