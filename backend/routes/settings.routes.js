const express = require('express');
const router = express.Router();
const settingsController = require('../controllers/settings.controller');
const { protect, adminOnly, superAdminOnly } = require('../middleware/auth.middleware');

// Get all settings (admin only)
router.get('/', protect, adminOnly, settingsController.getAllSettings);

// Get setting by key (admin only or public if isPublic)
router.get('/:key', settingsController.getSettingByKey);

// Update setting (admin only)
router.put('/:key', protect, adminOnly, settingsController.updateSetting);

// Update multiple settings (admin only)
router.put('/', protect, adminOnly, settingsController.updateMultipleSettings);

// Create setting (superadmin only)
router.post('/', protect, superAdminOnly, settingsController.createSetting);

// Delete setting (superadmin only)
router.delete('/:key', protect, superAdminOnly, settingsController.deleteSetting);

// Initialize default settings (superadmin only)
router.post('/initialize', protect, superAdminOnly, settingsController.initializeDefaults);

// Get public settings (no auth)
router.get('/public/all', settingsController.getPublicSettings);

// Test email config (admin only)
router.post('/test-email', protect, adminOnly, settingsController.testEmailConfig);

// Backup settings (admin only)
router.get('/backup', protect, adminOnly, settingsController.backupSettings);

// Restore settings from backup (superadmin only)
router.post('/restore', protect, superAdminOnly, settingsController.restoreSettings);

module.exports = router;
