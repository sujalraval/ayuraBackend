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
    getLabTestById
} = require('../controllers/labTestController');

// GET all lab tests
router.get('/', getAllLabTests);

// SPECIFIC ROUTES MUST COME FIRST (before /:id)
router.get('/search', searchLabTests);
router.get('/category/slug/:slug', getLabTestsByCategorySlug);
router.get('/uncategorized', getUncategorizedLabTests);

// PARAMETERIZED ROUTES COME LAST
router.get('/:id', getLabTestById);

// POST create new lab test
router.post('/', createLabTest);

// PUT update lab test
router.put('/:id', updateLabTest);

// DELETE lab test
router.delete('/:id', deleteLabTest);

module.exports = router;
