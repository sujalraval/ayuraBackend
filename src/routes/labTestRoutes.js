const express = require('express');
const router = express.Router();
const {
    getAllLabTests,
    getLabTestsByCategorySlug,
    getLabTestsByCategoryName,
    createLabTest,
    updateLabTest,
    deleteLabTest
} = require('../controllers/labTestController');

// GET all lab tests
router.get('/', getAllLabTests);

// GET lab tests by category slug (most specific route first)
router.get('/category/slug/:slug', getLabTestsByCategorySlug);

// GET lab tests by category name (alternative route)
router.get('/category/name/:name', getLabTestsByCategoryName);

// POST create new lab test
router.post('/', createLabTest);

// PUT update lab test
router.put('/:id', updateLabTest);

// DELETE lab test
router.delete('/:id', deleteLabTest);

module.exports = router;





// const express = require('express');
// const router = express.Router();
// const {
//     getAllLabTests,
//     getLabTestsByCategorySlug,
//     getLabTestsByCategoryName,
//     createLabTest,
//     updateLabTest,
//     deleteLabTest
// } = require('../controllers/labTestController');

// router.get('/', getAllLabTests);

// router.get('/category/slug/:slug', getLabTestsByCategorySlug);
// // Enable category by name route and place it first
// router.get('/category/name/:name', getLabTestsByCategoryName);

// router.post('/', createLabTest);
// router.put('/:id', updateLabTest);
// router.delete('/:id', deleteLabTest);

// module.exports = router;