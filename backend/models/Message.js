const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Ism kiritilishi shart'],
    trim: true,
    maxlength: [100, 'Ism 100 ta belgidan oshmasligi kerak']
  },
  email: {
    type: String,
    required: [true, 'Email kiritilishi shart'],
    lowercase: true,
    trim: true,
    match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Iltimos, to\'g\'ri email kiriting']
  },
  phone: {
    type: String,
    match: [/^\+998[0-9]{9}$/, 'Telefon raqami +998XXXXXXXXX formatida bo\'lishi kerak']
  },
  subject: {
    type: String,
    required: [true, 'Mavzu kiritilishi shart'],
    trim: true,
    maxlength: [200, 'Mavzu 200 ta belgidan oshmasligi kerak']
  },
  message: {
    type: String,
    required: [true, 'Xabar kiritilishi shart'],
    maxlength: [5000, 'Xabar 5000 ta belgidan oshmasligi kerak']
  },
  type: {
    type: String,
    enum: ['general', 'complaint', 'suggestion', 'booking', 'feedback', 'other'],
    default: 'general'
  },
  status: {
    type: String,
    enum: ['new', 'read', 'replied', 'archived', 'spam'],
    default: 'new'
  },
  priority: {
    type: String,
    enum: ['low', 'normal', 'high', 'urgent'],
    default: 'normal'
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  reply: {
    message: String,
    repliedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    repliedAt: Date
  },
  ipAddress: {
    type: String
  },
  userAgent: {
    type: String
  },
  source: {
    type: String,
    enum: ['website', 'email', 'phone', 'mobile_app', 'other'],
    default: 'website'
  },
  attachments: [{
    filename: String,
    path: String,
    size: Number,
    mimetype: String
  }],
  metadata: {
    pageUrl: String,
    formName: String,
    browser: String,
    os: String,
    device: String
  },
  readAt: {
    type: Date
  },
  archivedAt: {
    type: Date
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
messageSchema.index({ status: 1, createdAt: -1 });
messageSchema.index({ email: 1 });
messageSchema.index({ type: 1 });
messageSchema.index({ priority: 1 });

// Update updatedAt timestamp
messageSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Mark as read method
messageSchema.methods.markAsRead = function(userId) {
  this.status = 'read';
  this.readAt = new Date();
  return this.save();
};

// Reply to message method
messageSchema.methods.replyToMessage = function(replyMessage, userId) {
  this.reply = {
    message: replyMessage,
    repliedBy: userId,
    repliedAt: new Date()
  };
  this.status = 'replied';
  return this.save();
};

// Static method to get unread messages count
messageSchema.statics.getUnreadCount = function() {
  return this.countDocuments({ status: 'new' });
};

// Static method to get messages by status
messageSchema.statics.getByStatus = function(status, limit = 50) {
  return this.find({ status: status })
    .sort({ createdAt: -1 })
    .limit(limit);
};

// Static method to get urgent messages
messageSchema.statics.getUrgentMessages = function() {
  return this.find({
    priority: 'urgent',
    status: { $in: ['new', 'read'] }
  })
  .sort({ createdAt: -1 });
};

const Message = mongoose.model('Message', messageSchema);

module.exports = Message;
