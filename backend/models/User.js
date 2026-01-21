const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Ism kiritilishi shart'],
    trim: true,
    minlength: [2, 'Ism kamida 2 ta harfdan iborat bo\'lishi kerak'],
    maxlength: [50, 'Ism 50 ta harfdan oshmasligi kerak']
  },
  email: {
    type: String,
    required: [true, 'Email kiritilishi shart'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Iltimos, to\'g\'ri email kiriting']
  },
  phone: {
    type: String,
    required: [true, 'Telefon raqami kiritilishi shart'],
    match: [/^\+998[0-9]{9}$/, 'Telefon raqami +998XXXXXXXXX formatida bo\'lishi kerak']
  },
  password: {
    type: String,
    required: [true, 'Parol kiritilishi shart'],
    minlength: [6, 'Parol kamida 6 ta belgidan iborat bo\'lishi kerak'],
    select: false
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  emailVerified: {
    type: Boolean,
    default: false
  },
  phoneVerified: {
    type: Boolean,
    default: false
  },
  avatar: {
    type: String,
    default: null
  },
  favorites: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Menu'
  }],
  loginMethod: {
    type: String,
    enum: ['email', 'google', 'phone'],
    default: 'email'
  },
  googleId: {
    type: String,
    sparse: true
  },
  lastLogin: {
    type: Date
  },
  resetPasswordToken: String,
  resetPasswordExpire: Date,
  emailVerificationToken: String,
  emailVerificationExpire: Date,
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual field for bookings count
userSchema.virtual('bookingsCount', {
  ref: 'Booking',
  localField: '_id',
  foreignField: 'user',
  count: true
});

// Virtual field for bookings
userSchema.virtual('bookings', {
  ref: 'Booking',
  localField: '_id',
  foreignField: 'user'
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  try {
    const salt = await bcrypt.genSalt(parseInt(process.env.BCRYPT_SALT_ROUNDS || 12));
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Update updatedAt timestamp
userSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Generate password reset token
userSchema.methods.generateResetPasswordToken = function() {
  const crypto = require('crypto');
  const resetToken = crypto.randomBytes(32).toString('hex');
  this.resetPasswordToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');
  this.resetPasswordExpire = Date.now() + 10 * 60 * 1000; // 10 minutes
  return resetToken;
};

// Generate email verification token
userSchema.methods.generateEmailVerificationToken = function() {
  const crypto = require('crypto');
  const verificationToken = crypto.randomBytes(32).toString('hex');
  this.emailVerificationToken = crypto
    .createHash('sha256')
    .update(verificationToken)
    .digest('hex');
  this.emailVerificationExpire = Date.now() + 24 * 60 * 60 * 1000; // 24 hours
  return verificationToken;
};

const User = mongoose.model('User', userSchema);

module.exports = User;
