const express = require('express');
const router = express.Router();
const Menu = require('../models/Menu');
const Message = require('../models/Message');
const Booking = require('../models/Booking');

// Public: Get menu
router.get('/menu', async (req, res, next) => {
  try {
    const menu = await Menu.find();
    res.json({ success: true, menu });
  } catch (err) {
    next(err);
  }
});

// Public: Create booking
router.post('/booking', async (req, res, next) => {
  try {
    const booking = await Booking.create(req.body);
    res.status(201).json({ success: true, booking });
  } catch (err) {
    next(err);
  }
});

// Public: Send message
router.post('/message', async (req, res, next) => {
  try {
    const message = await Message.create(req.body);
    res.status(201).json({ success: true, message });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
