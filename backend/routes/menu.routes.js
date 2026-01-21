const express = require('express');
const router = express.Router();
const Menu = require('../models/Menu');
const { protect, adminOnly } = require('../middleware/auth.middleware');

// Get all menu items
router.get('/', async (req, res, next) => {
  try {
    const menu = await Menu.find();
    res.json({ success: true, menu });
  } catch (err) {
    next(err);
  }
});

// Get menu item by ID
router.get('/:id', async (req, res, next) => {
  try {
    const item = await Menu.findById(req.params.id);
    if (!item) return res.status(404).json({ success: false, message: 'Taom topilmadi.' });
    res.json({ success: true, item });
  } catch (err) {
    next(err);
  }
});

// Create new menu item (admin only)
router.post('/', protect, adminOnly, async (req, res, next) => {
  try {
    const item = await Menu.create(req.body);
    res.status(201).json({ success: true, item });
  } catch (err) {
    next(err);
  }
});

// Update menu item (admin only)
router.put('/:id', protect, adminOnly, async (req, res, next) => {
  try {
    const item = await Menu.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json({ success: true, item });
  } catch (err) {
    next(err);
  }
});

// Delete menu item (admin only)
router.delete('/:id', protect, adminOnly, async (req, res, next) => {
  try {
    await Menu.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Taom o\'chirildi.' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
