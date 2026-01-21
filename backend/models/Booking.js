const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Foydalanuvchi ID si kiritilishi shart']
  },
  userName: {
    type: String,
    required: [true, 'Ism kiritilishi shart'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'Email kiritilishi shart'],
    lowercase: true,
    trim: true
  },
  phone: {
    type: String,
    required: [true, 'Telefon raqami kiritilishi shart'],
    match: [/^\+998[0-9]{9}$/, 'Telefon raqami +998XXXXXXXXX formatida bo\'lishi kerak']
  },
  date: {
    type: Date,
    required: [true, 'Sana kiritilishi shart'],
    min: [new Date(), 'Bron sanasi bugundan oldin bo\'lishi mumkin emas']
  },
  time: {
    type: String,
    required: [true, 'Vaqt kiritilishi shart'],
    match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Vaqt noto\'g\'ri formatda']
  },
  guests: {
    type: Number,
    required: [true, 'Mehmonlar soni kiritilishi shart'],
    min: [1, 'Kamida 1 kishi bo\'lishi kerak'],
    max: [50, 'Maksimum 50 kishi']
  },
  tableNumber: {
    type: Number,
    min: [1, 'Stol raqami 1 dan kichik bo\'lishi mumkin emas'],
    max: [50, 'Stol raqami 50 dan katta bo\'lishi mumkin emas']
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'cancelled', 'completed', 'no-show'],
    default: 'pending'
  },
  notes: {
    type: String,
    maxlength: [500, 'Izoh 500 ta belgidan oshmasligi kerak'],
    default: ''
  },
  specialRequirements: {
    type: String,
    maxlength: [500, 'Maxsus talablar 500 ta belgidan oshmasligi kerak'],
    default: ''
  },
  source: {
    type: String,
    enum: ['website', 'phone', 'walk-in', 'admin'],
    default: 'website'
  },
  reminderSent: {
    type: Boolean,
    default: false
  },
  confirmationSent: {
    type: Boolean,
    default: false
  },
  estimatedArrival: {
    type: Date
  },
  actualArrival: {
    type: Date
  },
  departureTime: {
    type: Date
  },
  totalAmount: {
    type: Number,
    default: 0,
    min: [0, 'Jami summa manfiy bo\'lishi mumkin emas']
  },
  paidAmount: {
    type: Number,
    default: 0,
    min: [0, 'To\'langan summa manfiy bo\'lishi mumkin emas']
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'partial', 'paid', 'refunded'],
    default: 'pending'
  },
  paymentMethod: {
    type: String,
    enum: ['cash', 'card', 'online', 'none'],
    default: 'none'
  },
  metadata: {
    ipAddress: String,
    userAgent: String,
    device: String
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
bookingSchema.index({ date: 1, time: 1 });
bookingSchema.index({ user: 1 });
bookingSchema.index({ status: 1 });
bookingSchema.index({ createdAt: -1 });

// Virtual field for booking duration
bookingSchema.virtual('duration').get(function() {
  if (this.actualArrival && this.departureTime) {
    return Math.round((this.departureTime - this.actualArrival) / (1000 * 60)); // minutes
  }
  return null;
});

// Check if booking date is in the future
bookingSchema.pre('save', function(next) {
  if (this.date < new Date()) {
    next(new Error('Bron sanasi bugundan oldin bo\'lishi mumkin emas'));
  }
  next();
});

// Update updatedAt timestamp
bookingSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Static method to get today's bookings
bookingSchema.statics.getTodayBookings = function() {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date();
  endOfDay.setHours(23, 59, 59, 999);
  return this.find({
    date: {
      $gte: startOfDay,
      $lte: endOfDay
    }
  });
};

// Static method to get upcoming bookings
bookingSchema.statics.getUpcomingBookings = function(days = 7) {
  const startDate = new Date();
  const endDate = new Date();
  endDate.setDate(endDate.getDate() + days);
  return this.find({
    date: {
      $gte: startDate,
      $lte: endDate
    },
    status: { $in: ['pending', 'confirmed'] }
  }).sort({ date: 1, time: 1 });
};

const Booking = mongoose.model('Booking', bookingSchema);

module.exports = Booking;
