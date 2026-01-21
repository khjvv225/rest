const mongoose = require('mongoose');

const menuItemSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Taom nomi kiritilishi shart'],
    trim: true,
    unique: true,
    maxlength: [100, 'Taom nomi 100 ta belgidan oshmasligi kerak']
  },
  nameUz: {
    type: String,
    trim: true,
    maxlength: [100, 'Taom nomi 100 ta belgidan oshmasligi kerak']
  },
  nameRu: {
    type: String,
    trim: true,
    maxlength: [100, 'Taom nomi 100 ta belgidan oshmasligi kerak']
  },
  nameEn: {
    type: String,
    trim: true,
    maxlength: [100, 'Taom nomi 100 ta belgidan oshmasligi kerak']
  },
  category: {
    type: String,
    required: [true, 'Kategoriya kiritilishi shart'],
    enum: [
      'main', 'appetizer', 'salad', 'soup', 'dessert', 'drink', 'special', 'breakfast', 'lunch', 'dinner'
    ]
  },
  subcategory: {
    type: String,
    trim: true
  },
  price: {
    type: Number,
    required: [true, 'Narx kiritilishi shart'],
    min: [0, 'Narx manfiy bo\'lishi mumkin emas']
  },
  oldPrice: {
    type: Number,
    min: [0, 'Eski narx manfiy bo\'lishi mumkin emas']
  },
  discount: {
    type: Number,
    min: [0, 'Chegirma foizi 0 dan kichik bo\'lishi mumkin emas'],
    max: [100, 'Chegirma foizi 100 dan katta bo\'lishi mumkin emas'],
    default: 0
  },
  description: {
    type: String,
    required: [true, 'Tavsif kiritilishi shart'],
    maxlength: [1000, 'Tavsif 1000 ta belgidan oshmasligi kerak']
  },
  descriptionUz: {
    type: String,
    maxlength: [1000, 'Tavsif 1000 ta belgidan oshmasligi kerak']
  },
  descriptionRu: {
    type: String,
    maxlength: [1000, 'Tavsif 1000 ta belgidan oshmasligi kerak']
  },
  descriptionEn: {
    type: String,
    maxlength: [1000, 'Tavsif 1000 ta belgidan oshmasligi kerak']
  },
  ingredients: [{
    type: String,
    trim: true
  }],
  allergens: [{
    type: String,
    enum: [
      'gluten', 'dairy', 'eggs', 'nuts', 'soy', 'fish', 'shellfish', 'sesame', 'mustard'
    ]
  }],
  spicyLevel: {
    type: Number,
    min: [0, 'Achchiqlik darajasi 0 dan kichik bo\'lishi mumkin emas'],
    max: [5, 'Achchiqlik darajasi 5 dan katta bo\'lishi mumkin emas'],
    default: 0
  },
  preparationTime: {
    type: Number,
    min: [0, 'Tayyorlash vaqti manfiy bo\'lishi mumkin emas'],
    default: 15
  },
  calories: {
    type: Number,
    min: [0, 'Kaloriya miqdori manfiy bo\'lishi mumkin emas']
  },
  protein: {
    type: Number,
    min: [0, 'Protein miqdori manfiy bo\'lishi mumkin emas']
  },
  carbs: {
    type: Number,
    min: [0, 'Uglevod miqdori manfiy bo\'lishi mumkin emas']
  },
  fat: {
    type: Number,
    min: [0, 'Yog\' miqdori manfiy bo\'lishi mumkin emas']
  },
  image: {
    type: String,
    default: null
  },
  images: [{
    type: String
  }],
  isVegetarian: {
    type: Boolean,
    default: false
  },
  isVegan: {
    type: Boolean,
    default: false
  },
  isGlutenFree: {
    type: Boolean,
    default: false
  },
  isSpicy: {
    type: Boolean,
    default: false
  },
  isPopular: {
    type: Boolean,
    default: false
  },
  isRecommended: {
    type: Boolean,
    default: false
  },
  isAvailable: {
    type: Boolean,
    default: true
  },
  isSpecial: {
    type: Boolean,
    default: false
  },
  isSeasonal: {
    type: Boolean,
    default: false
  },
  seasonStart: {
    type: Date
  },
  seasonEnd: {
    type: Date
  },
  orderCount: {
    type: Number,
    default: 0,
    min: [0, 'Buyurtmalar soni manfiy bo\'lishi mumkin emas']
  },
  averageRating: {
    type: Number,
    default: 0,
    min: [0, 'O\'rtacha reyting 0 dan kichik bo\'lishi mumkin emas'],
    max: [5, 'O\'rtacha reyting 5 dan katta bo\'lishi mumkin emas']
  },
  ratingCount: {
    type: Number,
    default: 0,
    min: [0, 'Reytinglar soni manfiy bo\'lishi mumkin emas']
  },
  tags: [{
    type: String,
    trim: true
  }],
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
menuItemSchema.index({ category: 1, sortOrder: 1 });
menuItemSchema.index({ isAvailable: 1 });
menuItemSchema.index({ isPopular: 1 });
menuItemSchema.index({ isRecommended: 1 });
menuItemSchema.index({ price: 1 });

// Virtual field for discounted price
menuItemSchema.virtual('discountedPrice').get(function() {
  if (this.discount > 0) {
    return this.price - (this.price * this.discount / 100);
  }
  return this.price;
});

// Virtual field for savings
menuItemSchema.virtual('savings').get(function() {
  if (this.discount > 0) {
    return this.price * this.discount / 100;
  }
  return 0;
});

// Update updatedAt timestamp
menuItemSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Check if item is in season
menuItemSchema.methods.isInSeason = function() {
  if (!this.isSeasonal || !this.seasonStart || !this.seasonEnd) {
    return true;
  }
  const now = new Date();
  return now >= this.seasonStart && now <= this.seasonEnd;
};

// Static method to get available items
menuItemSchema.statics.getAvailableItems = function() {
  return this.find({
    isAvailable: true,
    $or: [
      { isSeasonal: false },
      {
        isSeasonal: true,
        seasonStart: { $lte: new Date() },
        seasonEnd: { $gte: new Date() }
      }
    ]
  });
};

// Static method to get items by category
menuItemSchema.statics.getByCategory = function(category) {
  return this.find({
    category: category,
    isAvailable: true
  }).sort({ sortOrder: 1 });
};

// Static method to get popular items
menuItemSchema.statics.getPopularItems = function(limit = 10) {
  return this.find({
    isAvailable: true,
    isPopular: true
  })
  .sort({ orderCount: -1 })
  .limit(limit);
};

// Static method to get recommended items
menuItemSchema.statics.getRecommendedItems = function(limit = 10) {
  return this.find({
    isAvailable: true,
    isRecommended: true
  })
  .sort({ averageRating: -1 })
  .limit(limit);
};

const Menu = mongoose.model('Menu', menuItemSchema);

module.exports = Menu;
