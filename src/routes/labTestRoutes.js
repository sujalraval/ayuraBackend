const express = require('express');
const router = express.Router();
const {
    getAllLabTests,
    getLabTestsByCategorySlug,
    getUncategorizedLabTests,
    createLabTest,
    updateLabTest,
    deleteLabTest,
    searchLabTests,
    getLabTestById,
    bulkCreateLabTests
} = require('../controllers/labTestController');

// GET all lab tests
router.get('/', getAllLabTests);

// Search routes
router.get('/search', searchLabTests);

// Category routes
router.get('/category/slug/:slug', getLabTestsByCategorySlug);
router.get('/uncategorized', getUncategorizedLabTests);

// CRUD operations
router.post('/', createLabTest);
router.get('/:id', getLabTestById);
router.put('/:id', updateLabTest);
router.delete('/:id', deleteLabTest);

// Bulk create lab tests
router.post('/bulk', bulkCreateLabTests);
module.exports = router;