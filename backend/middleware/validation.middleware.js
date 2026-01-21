const { body, param, query, validationResult } = require('express-validator');
const mongoose = require('mongoose');

// Validation error handler
exports.validate = (validations) => {
  return async (req, res, next) => {
    // Run all validations
    await Promise.all(validations.map(validation => validation.run(req)));

    const errors = validationResult(req);
    if (errors.isEmpty()) {
      return next();
    }

    // Format error messages
    const formattedErrors = errors.array().map(err => ({
      field: err.param,
      message: err.msg,
      value: err.value
    }));

    return res.status(400).json({
      success: false,
      message: 'Validatsiya xatolari',
      errors: formattedErrors
    });
  };
};

// Common validation rules
exports.validationRules = {
  // User validations
  registerUser: [
    body('name')
      .trim()
      .notEmpty().withMessage('Ism kiritilishi shart')
      .isLength({ min: 2, max: 50 }).withMessage('Ism 2-50 belgi orasida bo\'lishi kerak'),
    
    body('email')
      .trim()
      .notEmpty().withMessage('Email kiritilishi shart')
      .isEmail().withMessage('To\'g\'ri email kiriting')
      .normalizeEmail(),
    
    body('phone')
      .trim()
      .notEmpty().withMessage('Telefon raqami kiritilishi shart')
      .matches(/^\+998[0-9]{9}$/).withMessage('Telefon raqami +998XXXXXXXXX formatida bo\'lishi kerak'),
    
    body('password')
      .notEmpty().withMessage('Parol kiritilishi shart')
      .isLength({ min: 6 }).withMessage('Parol kamida 6 ta belgidan iborat bo\'lishi kerak')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
      .withMessage('Parol kamida 1 katta harf, 1 kichik harf va 1 raqamdan iborat bo\'lishi kerak'),
    
    body('confirmPassword')
      .notEmpty().withMessage('Parolni tasdiqlash kiritilishi shart')
      .custom((value, { req }) => value === req.body.password)
      .withMessage('Parollar mos kelmadi')
  ],

  loginUser: [
    body('email')
      .trim()
      .notEmpty().withMessage('Email kiritilishi shart')
      .isEmail().withMessage('To\'g\'ri email kiriting'),
    
    body('password')
      .notEmpty().withMessage('Parol kiritilishi shart')
  ],

  // Admin validations
  createAdmin: [
    body('username')
      .trim()
      .notEmpty().withMessage('Foydalanuvchi nomi kiritilishi shart')
      .isLength({ min: 3, max: 30 }).withMessage('Foydalanuvchi nomi 3-30 belgi orasida bo\'lishi kerak'),
    
    body('email')
      .trim()
      .notEmpty().withMessage('Email kiritilishi shart')
      .isEmail().withMessage('To\'g\'ri email kiriting'),
    
    body('password')
      .notEmpty().withMessage('Parol kiritilishi shart')
      .isLength({ min: 8 }).withMessage('Parol kamida 8 ta belgidan iborat bo\'lishi kerak'),
    
    body('fullName')
      .trim()
      .notEmpty().withMessage('To\'liq ism kiritilishi shart')
      .isLength({ min: 2, max: 100 }).withMessage('To\'liq ism 2-100 belgi orasida bo\'lishi kerak'),
    
    body('role')
      .optional()
      .isIn(['admin', 'manager', 'staff']).withMessage('Yaroqsiz rol')
  ],

  // Booking validations
  createBooking: [
    body('userName')
      .trim()
      .notEmpty().withMessage('Ism kiritilishi shart')
      .isLength({ min: 2, max: 100 }).withMessage('Ism 2-100 belgi orasida bo\'lishi kerak'),
    
    body('email')
      .trim()
      .notEmpty().withMessage('Email kiritilishi shart')
      .isEmail().withMessage('To\'g\'ri email kiriting'),
    
    body('phone')
      .trim()
      .notEmpty().withMessage('Telefon raqami kiritilishi shart')
      .matches(/^\+998[0-9]{9}$/).withMessage('Telefon raqami +998XXXXXXXXX formatida bo\'lishi kerak'),
    
    body('date')
      .notEmpty().withMessage('Sana kiritilishi shart')
      .isISO8601().withMessage('To\'g\'ri sana formatini kiriting (YYYY-MM-DD)')
      .custom((value) => {
        const date = new Date(value);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return date >= today;
      }).withMessage('Sana bugundan oldin bo\'lishi mumkin emas'),
    
    body('time')
      .trim()
      .notEmpty().withMessage('Vaqt kiritilishi shart')
      .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Vaqt noto\'g\'ri formatda (HH:MM)'),
    
    body('guests')
      .notEmpty().withMessage('Mehmonlar soni kiritilishi shart')
      .isInt({ min: 1, max: 50 }).withMessage('Mehmonlar soni 1-50 orasida bo\'lishi kerak'),
    
    body('notes')
      .optional()
      .isLength({ max: 500 }).withMessage('Izoh 500 belgidan oshmasligi kerak')
  ],

  // Menu item validations
  createMenuItem: [
    body('name')
      .trim()
      .notEmpty().withMessage('Taom nomi kiritilishi shart')
      .isLength({ min: 2, max: 100 }).withMessage('Taom nomi 2-100 belgi orasida bo\'lishi kerak'),
    
    body('category')
      .trim()
      .notEmpty().withMessage('Kategoriya kiritilishi shart')
      .isIn(['main', 'appetizer', 'salad', 'soup', 'dessert', 'drink', 'special', 'breakfast', 'lunch', 'dinner'])
      .withMessage('Yaroqsiz kategoriya'),
    
    body('price')
      .notEmpty().withMessage('Narx kiritilishi shart')
      .isFloat({ min: 0 }).withMessage('Narx manfiy bo\'lishi mumkin emas'),
    
    body('description')
      .trim()
      .notEmpty().withMessage('Tavsif kiritilishi shart')
      .isLength({ min: 10, max: 1000 }).withMessage('Tavsif 10-1000 belgi orasida bo\'lishi kerak'),
    
    body('ingredients')
      .optional()
      .isArray().withMessage('Ingredientlar massiv shaklida bo\'lishi kerak'),
    
    body('preparationTime')
      .optional()
      .isInt({ min: 0 }).withMessage('Tayyorlash vaqti manfiy bo\'lishi mumkin emas'),
    
    body('isAvailable')
      .optional()
      .isBoolean().withMessage('Mavjudligi mantiqiy qiymat bo\'lishi kerak'),
    
    body('isPopular')
      .optional()
      .isBoolean().withMessage('Mashhurligi mantiqiy qiymat bo\'lishi kerak'),
    
    body('isRecommended')
      .optional()
      .isBoolean().withMessage('Tavsiya etilishi mantiqiy qiymat bo\'lishi kerak')
  ],

  // Message validations
  createMessage: [
    body('name')
      .trim()
      .notEmpty().withMessage('Ism kiritilishi shart')
      .isLength({ min: 2, max: 100 }).withMessage('Ism 2-100 belgi orasida bo\'lishi kerak'),
    
    body('email')
      .trim()
      .notEmpty().withMessage('Email kiritilishi shart')
      .isEmail().withMessage('To\'g\'ri email kiriting'),
    
    body('subject')
      .trim()
      .notEmpty().withMessage('Mavzu kiritilishi shart')
      .isLength({ min: 5, max: 200 }).withMessage('Mavzu 5-200 belgi orasida bo\'lishi kerak'),
    
    body('message')
      .trim()
      .notEmpty().withMessage('Xabar kiritilishi shart')
      .isLength({ min: 10, max: 5000 }).withMessage('Xabar 10-5000 belgi orasida bo\'lishi kerak'),
    
    body('type')
      .optional()
      .isIn(['general', 'complaint', 'suggestion', 'booking', 'feedback', 'other'])
      .withMessage('Yaroqsiz xabar turi')
  ],

  // Setting validations
  updateSetting: [
    body('key')
      .trim()
      .notEmpty().withMessage('Sozlama kaliti kiritilishi shart')
      .isLength({ max: 50 }).withMessage('Kalit 50 belgidan oshmasligi kerak'),
    
    body('value')
      .notEmpty().withMessage('Sozlama qiymati kiritilishi shart'),
    
    body('type')
      .optional()
      .isIn(['string', 'number', 'boolean', 'array', 'object', 'json'])
      .withMessage('Yaroqsiz qiymat turi')
  ],

  // Pagination validations
  pagination: [
    query('page')
      .optional()
      .isInt({ min: 1 }).withMessage('Sahifa raqami 1 dan kichik bo\'lishi mumkin emas')
      .toInt(),
    
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 }).withMessage('Limit 1-100 orasida bo\'lishi kerak')
      .toInt(),
    
    query('sort')
      .optional()
      .isString().withMessage('Saralash parametri satr bo\'lishi kerak'),
    
    query('order')
      .optional()
      .isIn(['asc', 'desc']).withMessage('Tartib faqat "asc" yoki "desc" bo\'lishi mumkin')
  ],

  // ID validation
  validateId: (idField = 'id') => [
    param(idField)
      .notEmpty().withMessage('ID kiritilishi shart')
      .custom((value) => mongoose.Types.ObjectId.isValid(value))
      .withMessage('Yaroqsiz ID format')
  ],

  // Email validation
  validateEmail: [
    body('email')
      .trim()
      .notEmpty().withMessage('Email kiritilishi shart')
      .isEmail().withMessage('To\'g\'ri email kiriting')
      .normalizeEmail()
  ],

  // Password validation
  validatePassword: [
    body('password')
      .notEmpty().withMessage('Parol kiritilishi shart')
      .isLength({ min: 6 }).withMessage('Parol kamida 6 ta belgidan iborat bo\'lishi kerak')
  ],

  // Phone validation
  validatePhone: [
    body('phone')
      .trim()
      .notEmpty().withMessage('Telefon raqami kiritilishi shart')
      .matches(/^\+998[0-9]{9}$/).withMessage('Telefon raqami +998XXXXXXXXX formatida bo\'lishi kerak')
  ]
};

// Sanitize input data
exports.sanitizeInput = (req, res, next) => {
  const sanitize = (obj) => {
    if (typeof obj !== 'object' || obj === null) return obj;
    
    Object.keys(obj).forEach(key => {
      if (typeof obj[key] === 'string') {
        // Remove potentially dangerous characters
        obj[key] = obj[key]
          .replace(/[<>]/g, '') // Remove < and >
          .trim();
      } else if (typeof obj[key] === 'object') {
        sanitize(obj[key]);
      }
    });
    
    return obj;
  };

  if (req.body) sanitize(req.body);
  if (req.query) sanitize(req.query);
  if (req.params) sanitize(req.params);

  next();
};

// Check if date is valid and in future
exports.validateFutureDate = (dateField) => {
  return (req, res, next) => {
    const date = new Date(req.body[dateField]);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (date < today) {
      return res.status(400).json({
        success: false,
        message: `${dateField} bugundan oldin bo'lishi mumkin emas`
      });
    }

    next();
  };
};

// Check if time is within business hours
exports.validateBusinessHours = (req, res, next) => {
  const time = req.body.time;
  const [hours, minutes] = time.split(':').map(Number);

  // Business hours: 9:00 - 23:00
  if (hours < 9 || hours > 23 || (hours === 23 && minutes > 0)) {
    return res.status(400).json({
      success: false,
      message: 'Bron vaqti bizning ish vaqtimizda (9:00 - 23:00) bo\'lishi kerak'
    });
  }

  next();
};

// Check if guests count is within limit
exports.validateGuestsLimit = async (req, res, next) => {
  try {
    // Get max guests limit from settings
    const Setting = require('../models/Setting');
    const maxGuests = await Setting.getByKey('MAX_GUESTS_PER_BOOKING') || 20;

    if (req.body.guests > maxGuests) {
      return res.status(400).json({
        success: false,
        message: `Bir bron uchun maksimum ${maxGuests} kishi mumkin`
      });
    }

    next();
  } catch (error) {
    next(error);
  }
};
