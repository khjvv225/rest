const mongoose = require('mongoose');

const settingSchema = new mongoose.Schema({
  key: {
    type: String,
    required: [true, 'Sozlama kaliti kiritilishi shart'],
    unique: true,
    trim: true,
    uppercase: true
  },
  
  value: {
    type: mongoose.Schema.Types.Mixed,
    required: [true, 'Sozlama qiymati kiritilishi shart']
  },
  
  type: {
    type: String,
    enum: ['string', 'number', 'boolean', 'array', 'object', 'json'],
    default: 'string'
  },
  
  category: {
    type: String,
    required: [true, 'Kategoriya kiritilishi shart'],
    enum: [
      'general',      // Umumiy sozlamalar
      'restaurant',   // Restoran sozlamalari
      'booking',      // Bron sozlamalari
      'payment',      // To'lov sozlamalari
      'email',        // Email sozlamalari
      'sms',          // SMS sozlamalari
      'notification', // Bildirishnoma sozlamalari
      'seo',          // SEO sozlamalari
      'social',       // Ijtimoiy tarmoqlar
      'api',          // API sozlamalari
      'security',     // Xavfsizlik sozlamalari
      'other'         // Boshqa sozlamalar
    ]
  },
  
  label: {
    type: String,
    required: [true, 'Sozlama nomi kiritilishi shart'],
    trim: true
  },
  
  description: {
    type: String,
    maxlength: [500, 'Tavsif 500 ta belgidan oshmasligi kerak'],
    default: ''
  },
  
  options: {
    type: mongoose.Schema.Types.Mixed
  },
  
  isPublic: {
    type: Boolean,
    default: false
  },
  
  isEditable: {
    type: Boolean,
    default: true
  },
  
  isRequired: {
    type: Boolean,
    default: false
  },
  
  validation: {
    type: mongoose.Schema.Types.Mixed
  },
  
  sortOrder: {
    type: Number,
    default: 0
  },
  
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
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
settingSchema.index({ key: 1 }, { unique: true });
settingSchema.index({ category: 1, sortOrder: 1 });
settingSchema.index({ isPublic: 1 });

// Update updatedAt timestamp
settingSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Validate value based on type
settingSchema.pre('save', function(next) {
  if (this.validation) {
    switch (this.type) {
      case 'string':
        if (typeof this.value !== 'string') {
          return next(new Error(`Sozlama ${this.key} uchun string qiymat kiritilishi kerak`));
        }
        if (this.validation.minLength && this.value.length < this.validation.minLength) {
          return next(new Error(`Sozlama ${this.key} uchun minimum ${this.validation.minLength} belgi kiritilishi kerak`));
        }
        if (this.validation.maxLength && this.value.length > this.validation.maxLength) {
          return next(new Error(`Sozlama ${this.key} uchun maksimum ${this.validation.maxLength} belgi kiritilishi mumkin`));
        }
        if (this.validation.pattern && !new RegExp(this.validation.pattern).test(this.value)) {
          return next(new Error(`Sozlama ${this.key} uchun to'g'ri format kiritilmadi`));
        }
        break;
        
      case 'number':
        if (typeof this.value !== 'number') {
          return next(new Error(`Sozlama ${this.key} uchun raqam kiritilishi kerak`));
        }
        if (this.validation.min !== undefined && this.value < this.validation.min) {
          return next(new Error(`Sozlama ${this.key} uchun minimum ${this.validation.min} kiritilishi kerak`));
        }
        if (this.validation.max !== undefined && this.value > this.validation.max) {
          return next(new Error(`Sozlama ${this.key} uchun maksimum ${this.validation.max} kiritilishi mumkin`));
        }
        break;
        
      case 'boolean':
        if (typeof this.value !== 'boolean') {
          return next(new Error(`Sozlama ${this.key} uchun mantiqiy qiymat (true/false) kiritilishi kerak`));
        }
        break;
        
      case 'array':
        if (!Array.isArray(this.value)) {
          return next(new Error(`Sozlama ${this.key} uchun massiv kiritilishi kerak`));
        }
        break;
        
      case 'object':
      case 'json':
        if (typeof this.value !== 'object' || Array.isArray(this.value)) {
          return next(new Error(`Sozlama ${this.key} uchun obyekt kiritilishi kerak`));
        }
        break;
    }
  }
  next();
});

// Static method to get setting by key
settingSchema.statics.getByKey = async function(key) {
  const setting = await this.findOne({ key: key.toUpperCase() });
  if (!setting) {
    throw new Error(`Sozlama ${key} topilmadi`);
  }
  return setting.value;
};

// Static method to get settings by category
settingSchema.statics.getByCategory = function(category, isPublic = false) {
  const query = { category: category };
  if (isPublic) {
    query.isPublic = true;
  }
  return this.find(query).sort({ sortOrder: 1 });
};

// Static method to update multiple settings
settingSchema.statics.updateMultiple = async function(settings) {
  const updates = [];
  
  for (const setting of settings) {
    const update = await this.findOneAndUpdate(
      { key: setting.key.toUpperCase() },
      { value: setting.value, updatedAt: new Date() },
      { new: true, runValidators: true }
    );
    updates.push(update);
  }
  
  return updates;
};

// Static method to initialize default settings
settingSchema.statics.initializeDefaults = async function() {
  const defaultSettings = [
    {
      key: 'RESTAURANT_NAME',
      value: 'BUKHARA REST',
      type: 'string',
      category: 'restaurant',
      label: 'Restoran Nomi',
      description: 'Restoraning rasmiy nomi',
      isPublic: true,
      isEditable: true,
      validation: { minLength: 2, maxLength: 100 }
    },
    {
      key: 'RESTAURANT_PHONE',
      value: '+998901234567',
      type: 'string',
      category: 'restaurant',
      label: 'Telefon Raqami',
      description: 'Asosiy telefon raqami',
      isPublic: true,
      isEditable: true,
      validation: { pattern: '^\\+998[0-9]{9}$' }
    },
    {
      key: 'RESTAURANT_EMAIL',
      value: 'info@bukhararest.uz',
      type: 'string',
      category: 'restaurant',
      label: 'Email Manzili',
      description: 'Asosiy email manzili',
      isPublic: true,
      isEditable: true,
      validation: { pattern: '^\\w+([\\.-]?\\w+)*@\\w+([\\.-]?\\w+)*(\\.\\w{2,3})+$' }
    },
    {
      key: 'RESTAURANT_ADDRESS',
      value: 'Buxoro shahri, Markaziy ko\'cha 123',
      type: 'string',
      category: 'restaurant',
      label: 'Manzil',
      description: 'Restoran manzili',
      isPublic: true,
      isEditable: true,
      validation: { minLength: 10, maxLength: 500 }
    },
    {
      key: 'WORKING_HOURS',
      value: 'Har kuni 9:00 - 23:00',
      type: 'string',
      category: 'restaurant',
      label: 'Ish Vaqti',
      description: 'Restoran ish vaqtlari',
      isPublic: true,
      isEditable: true
    },
    {
      key: 'BOOKING_ENABLED',
      value: true,
      type: 'boolean',
      category: 'booking',
      label: 'Bron Qilish Yoqilgan',
      description: 'Onlayn bron qilishni yoqish/o\'chirish',
      isPublic: false,
      isEditable: true
    },
    {
      key: 'MAX_GUESTS_PER_BOOKING',
      value: 20,
      type: 'number',
      category: 'booking',
      label: 'Bron Uchun Maksimum Mehmonlar',
      description: 'Bir bron uchun maksimum mehmonlar soni',
      isPublic: false,
      isEditable: true,
      validation: { min: 1, max: 100 }
    },
    {
      key: 'BOOKING_ADVANCE_DAYS',
      value: 30,
      type: 'number',
      category: 'booking',
      label: 'Oldindan Bron Qilish Kunlari',
      description: 'Oldindan bron qilish mumkin bo\'lgan kunlar soni',
      isPublic: false,
      isEditable: true,
      validation: { min: 1, max: 365 }
    },
    {
      key: 'CURRENCY',
      value: 'UZS',
      type: 'string',
      category: 'general',
      label: 'Valyuta',
      description: 'Asosiy valyuta',
      isPublic: true,
      isEditable: true
    },
    {
      key: 'TIMEZONE',
      value: 'Asia/Tashkent',
      type: 'string',
      category: 'general',
      label: 'Vaqt Mintaqasi',
      description: 'Server vaqt mintaqasi',
      isPublic: false,
      isEditable: true
    },
    {
      key: 'EMAIL_NOTIFICATIONS',
      value: true,
      type: 'boolean',
      category: 'email',
      label: 'Email Bildirishnomalari',
      description: 'Email orqali bildirishnomalarni yoqish/o\'chirish',
      isPublic: false,
      isEditable: true
    },
    {
      key: 'SMS_NOTIFICATIONS',
      value: false,
      type: 'boolean',
      category: 'sms',
      label: 'SMS Bildirishnomalari',
      description: 'SMS orqali bildirishnomalarni yoqish/o\'chirish',
      isPublic: false,
      isEditable: true
    }
  ];

  for (const setting of defaultSettings) {
    await this.findOneAndUpdate(
      { key: setting.key },
      { $setOnInsert: setting },
      { upsert: true }
    );
  }
  
  console.log('✅ Default settings initialized');
};

const Setting = mongoose.model('Setting', settingSchema);

module.exports = Setting;