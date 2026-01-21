const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Admin = require('../models/Admin');
const { generateToken, verifyRefreshToken, loginRateLimit } = require('../middleware/auth.middleware');
const bcrypt = require('bcryptjs');

// User registration
router.post('/register', async (req, res, next) => {
  try {
    const { name, email, password, phone } = req.body;
    if (!name || !email || !password || !phone) {
      return res.status(400).json({ success: false, message: 'Barcha maydonlarni to\'ldiring.' });
    }
    const existing = await User.findOne({ $or: [{ email }, { phone }] });
    if (existing) {
      return res.status(409).json({ success: false, message: 'Bu email yoki telefon allaqachon ro\'yxatdan o\'tgan.' });
    }
    // Assume phone is verified by Firebase in frontend
    const user = await User.create({ name, email, password, phone, phoneVerified: true, loginMethod: 'phone' });
    const tokens = generateToken(user, 'user');
    res.status(201).json({ success: true, user, ...tokens });
  } catch (err) {
    next(err);
  }
});

// User login
router.post('/login', loginRateLimit, async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email va parol talab qilinadi.' });
    }
    let user = await User.findOne({ email });
    let role = 'user';
    if (!user) {
      user = await Admin.findOne({ email });
      role = 'admin';
    }
    if (!user) {
      return res.status(401).json({ success: false, message: 'Email yoki parol noto\'g\'ri.' });
    }
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Email yoki parol noto\'g\'ri.' });
    }
    if (!user.isActive) {
      return res.status(403).json({ success: false, message: 'Foydalanuvchi bloklangan.' });
    }
    const tokens = generateToken(user, role);
    res.json({ success: true, user, ...tokens });
  } catch (err) {
    next(err);
  }
});

// Refresh token
router.post('/refresh', async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(400).json({ success: false, message: 'Refresh token talab qilinadi.' });
    }
    const user = await verifyRefreshToken(refreshToken);
    const role = user.role || 'user';
    const tokens = generateToken(user, role);
    res.json({ success: true, ...tokens });
  } catch (err) {
    next(err);
  }
});

// Logout (client should just delete token)
router.post('/logout', (req, res) => {
  res.json({ success: true, message: 'Chiqish muvaffaqiyatli.' });
});

module.exports = router;
