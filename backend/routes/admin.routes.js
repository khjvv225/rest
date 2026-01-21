const express = require('express');
const router = express.Router();
const Admin = require('../models/Admin');
const { protect, adminOnly, superAdminOnly, authorize, checkPermission } = require('../middleware/auth.middleware');

// Get all admins (superadmin only)
router.get('/', protect, superAdminOnly, async (req, res, next) => {
  try {
    const admins = await Admin.find();
    res.json({ success: true, admins });
  } catch (err) {
    next(err);
  }
});

// Create new admin (superadmin only)
router.post('/', protect, superAdminOnly, async (req, res, next) => {
  try {
    const { name, email, password, role, permissions } = req.body;
    const admin = await Admin.create({ name, email, password, role, permissions });
    res.status(201).json({ success: true, admin });
  } catch (err) {
    next(err);
  }
});

// Update admin (superadmin only)
router.put('/:id', protect, superAdminOnly, async (req, res, next) => {
  try {
    const admin = await Admin.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json({ success: true, admin });
  } catch (err) {
    next(err);
  }
});

// Delete admin (superadmin only)
router.delete('/:id', protect, superAdminOnly, async (req, res, next) => {
  try {
    await Admin.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Admin o\'chirildi.' });
  } catch (err) {
    next(err);
  }
});

// Update permissions (superadmin only)
router.put('/:id/permissions', protect, superAdminOnly, async (req, res, next) => {
  try {
    const admin = await Admin.findByIdAndUpdate(req.params.id, { permissions: req.body.permissions }, { new: true });
    res.json({ success: true, admin });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
