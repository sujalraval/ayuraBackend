const express = require('express');
const router = express.Router();
const {
    getAllLabTests,
    getLabTestsByCategorySlug,
    getUncategorizedLabTests,
    createLabTest,
    updateLabTest,
    deleteLabTest
} = require('../controllers/labTestController');

// GET all lab tests
router.get('/', getAllLabTests);

// GET lab tests by category slug
router.get('/category/slug/:slug', getLabTestsByCategorySlug);

// GET uncategorized lab tests
router.get('/uncategorized', getUncategorizedLabTests);

// POST create new lab test
router.post('/', createLabTest);

// PUT update lab test
router.put('/:id', updateLabTest);

// DELETE lab test
router.delete('/:id', deleteLabTest);

module.exports = router;