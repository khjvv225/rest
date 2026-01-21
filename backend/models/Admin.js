const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const adminSchema = new mongoose.Schema({
  username: {
    type: String,
    required: [true, 'Foydalanuvchi nomi kiritilishi shart'],
    unique: true,
    trim: true,
    minlength: [3, 'Foydalanuvchi nomi kamida 3 ta belgidan iborat bo\'lishi kerak'],
    maxlength: [30, 'Foydalanuvchi nomi 30 ta belgidan oshmasligi kerak']
  },
  email: {
    type: String,
    required: [true, 'Email kiritilishi shart'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Iltimos, to\'g\'ri email kiriting']
  },
  password: {
    type: String,
    required: [true, 'Parol kiritilishi shart'],
    minlength: [8, 'Parol kamida 8 ta belgidan iborat bo\'lishi kerak'],
    select: false
  },
  fullName: {
    type: String,
    required: [true, 'To\'liq ism kiritilishi shart'],
    trim: true
  },
  role: {
    type: String,
    enum: ['superadmin', 'admin', 'manager', 'staff'],
    default: 'staff'
  },
  permissions: [{
    module: {
      type: String,
      enum: [
        'dashboard',
        'users',
        'bookings',
        'menu',
        'messages',
        'settings',
        'reports',
        'analytics',
        'content'
      ]
    },
    actions: [{
      type: String,
      enum: ['create', 'read', 'update', 'delete', 'export', 'import']
    }]
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  lastLogin: {
    type: Date
  },
  lastLoginIp: {
    type: String
  },
  loginAttempts: {
    type: Number,
    default: 0
  },
  lockUntil: {
    type: Date
  },
  twoFactorEnabled: {
    type: Boolean,
    default: false
  },
  twoFactorSecret: {
    type: String,
    select: false
  },
  avatar: {
    type: String,
    default: null
  },
  phone: {
    type: String,
    match: [/^\+998[0-9]{9}$/, 'Telefon raqami +998XXXXXXXXX formatida bo\'lishi kerak']
  },
  department: {
    type: String,
    trim: true
  },
  notes: {
    type: String,
    maxlength: [500, 'Eslatmalar 500 ta belgidan oshmasligi kerak']
  },
  resetPasswordToken: String,
  resetPasswordExpire: Date,
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin'
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin'
  },
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

// Indexes for better query performance
adminSchema.index({ email: 1 }, { unique: true });
adminSchema.index({ username: 1 }, { unique: true });
adminSchema.index({ role: 1 });
adminSchema.index({ isActive: 1 });

// Hash password before saving
adminSchema.pre('save', async function(next) {
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
adminSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Check if admin is locked
adminSchema.virtual('isLocked').get(function() {
  return !!(this.lockUntil && this.lockUntil > Date.now());
});

// Increment login attempts
adminSchema.methods.incrementLoginAttempts = function() {
  if (this.lockUntil && this.lockUntil < Date.now()) {
    return this.updateOne({
      $set: { loginAttempts: 1 },
      $unset: { lockUntil: 1 }
    });
  }
  const updates = { $inc: { loginAttempts: 1 } };
  if (this.loginAttempts + 1 >= 5 && !this.isLocked) {
    updates.$set = { lockUntil: Date.now() + 2 * 60 * 60 * 1000 }; // 2 hours
  }
  return this.updateOne(updates);
};

// Reset login attempts
adminSchema.methods.resetLoginAttempts = function() {
  return this.updateOne({
    $set: { loginAttempts: 0 },
    $unset: { lockUntil: 1 }
  });
};

// Compare password method
adminSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Check permission method
adminSchema.methods.hasPermission = function(module, action) {
  if (this.role === 'superadmin') return true;
  const permission = this.permissions.find(p => p.module === module);
  if (!permission) return false;
  return permission.actions.includes(action);
};

// Generate password reset token
adminSchema.methods.generateResetPasswordToken = function() {
  const crypto = require('crypto');
  const resetToken = crypto.randomBytes(32).toString('hex');
  this.resetPasswordToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');
  this.resetPasswordExpire = Date.now() + 10 * 60 * 1000; // 10 minutes
  return resetToken;
};

// Static method to create first superadmin
adminSchema.statics.createSuperAdmin = async function() {
  const superAdminExists = await this.findOne({ role: 'superadmin' });
  if (!superAdminExists) {
    const superAdmin = new this({
      username: 'superadmin',
      email: process.env.ADMIN_EMAIL || 'admin@bukhararest.uz',
      password: process.env.ADMIN_DEFAULT_PASSWORD || 'admin123',
      fullName: 'Super Admin',
      role: 'superadmin',
      permissions: [
        { module: 'dashboard', actions: ['read'] },
        { module: 'users', actions: ['create', 'read', 'update', 'delete', 'export'] },
        { module: 'bookings', actions: ['create', 'read', 'update', 'delete', 'export'] },
        { module: 'menu', actions: ['create', 'read', 'update', 'delete', 'export', 'import'] },
        { module: 'messages', actions: ['create', 'read', 'update', 'delete', 'export'] },
        { module: 'settings', actions: ['create', 'read', 'update', 'delete'] },
        { module: 'reports', actions: ['read', 'export'] },
        { module: 'analytics', actions: ['read'] },
        { module: 'content', actions: ['create', 'read', 'update', 'delete'] }
      ]
    });
    await superAdmin.save();
    console.log('✅ Superadmin created successfully');
  }
};

const Admin = mongoose.model('Admin', adminSchema);

module.exports = Admin;
