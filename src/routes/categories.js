// const express = require('express');
// const router = express.Router();
// const Category = require('../models/Categories');

// // GET all categories (user side)
// router.get('/', async (req, res) => {
//     try {
//         const categories = await Category.find();
//         res.json(categories);
//     } catch (err) {
//         res.status(500).json({ error: 'Server error' });
//     }
// });

// // GET all categories (admin side)
// router.get('/all', async (req, res) => {
//     try {
//         const categories = await Category.find();
//         res.json(categories);
//     } catch (err) {
//         res.status(500).json({ error: 'Server error' });
//     }
// });

// // POST add category
// router.post('/', async (req, res) => {
//     try {
//         const { name, description, icon, slug } = req.body;
//         const category = new Category({ name, description, icon, slug });
//         await category.save();
//         res.status(201).json(category);
//     } catch (err) {
//         res.status(400).json({ error: err.message });
//     }
// });

// // PUT update category
// router.put('/:id', async (req, res) => {
//     try {
//         const updated = await Category.findByIdAndUpdate(
//             req.params.id,
//             req.body,
//             { new: true, runValidators: true }
//         );
//         if (!updated) {
//             return res.status(404).json({ error: 'Category not found' });
//         }
//         res.json(updated);
//     } catch (err) {
//         res.status(400).json({ error: err.message });
//     }
// });

// // DELETE category
// router.delete('/:id', async (req, res) => {
//     try {
//         const deleted = await Category.findByIdAndDelete(req.params.id);
//         if (!deleted) {
//             return res.status(404).json({ error: 'Category not found' });
//         }
//         res.json({ message: 'Deleted' });
//     } catch (err) {
//         res.status(400).json({ error: err.message });
//     }
// });

// module.exports = router;

const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/categoryController');

router.get('/', categoryController.getAllCategories);
router.get('/all', categoryController.getAllAdminCategories);
router.post('/', categoryController.createCategory);
router.put('/:id', categoryController.updateCategory);
router.delete('/:id', categoryController.deleteCategory);

module.exports = router;
