const express = require('express');
const router = express.Router();
const Booking = require('../models/Booking');
const { protect, adminOnly } = require('../middleware/auth.middleware');

// Create a new booking
router.post('/', async (req, res, next) => {
  try {
    const booking = await Booking.create(req.body);
    res.status(201).json({ success: true, booking });
  } catch (err) {
    next(err);
  }
});

// Get all bookings (admin only)
router.get('/', protect, adminOnly, async (req, res, next) => {
  try {
    const bookings = await Booking.find();
    res.json({ success: true, bookings });
  } catch (err) {
    next(err);
  }
});

// Get booking by ID (admin only)
router.get('/:id', protect, adminOnly, async (req, res, next) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ success: false, message: 'Buyurtma topilmadi.' });
    res.json({ success: true, booking });
  } catch (err) {
    next(err);
  }
});

// Update booking (admin only)
router.put('/:id', protect, adminOnly, async (req, res, next) => {
  try {
    const booking = await Booking.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json({ success: true, booking });
  } catch (err) {
    next(err);
  }
});

// Delete booking (admin only)
router.delete('/:id', protect, adminOnly, async (req, res, next) => {
  try {
    await Booking.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Buyurtma o\'chirildi.' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
