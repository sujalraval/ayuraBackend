const express = require('express');
const router = express.Router();
const multerConfig = require('../config/multerConfig');

const {
    getAllExpectations,
    createExpectation,
    updateExpectation,
    deleteExpectation
} = require('../controllers/expectationController');

router.get('/', getAllExpectations);
router.post('/', multerConfig.single('image'), createExpectation);
router.put('/:id', multerConfig.single('image'), updateExpectation);
router.delete('/:id', deleteExpectation);

module.exports = router;