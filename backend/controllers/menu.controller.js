const Menu = require('../models/Menu');
const cloudinary = require('../config/cloudinary');
const fs = require('fs');
const path = require('path');

// Get all menu items with filters
exports.getAllMenuItems = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    
    const {
      category,
      isAvailable,
      isPopular,
      isRecommended,
      search,
      minPrice,
      maxPrice,
      sortBy = 'sortOrder',
      order = 'asc'
    } = req.query;
    
    // Build query
    let query = { isAvailable: true };
    
    // Category filter
    if (category) {
      query.category = category;
    }
    
    // Boolean filters
    if (isAvailable !== undefined) query.isAvailable = isAvailable === 'true';
    if (isPopular !== undefined) query.isPopular = isPopular === 'true';
    if (isRecommended !== undefined) query.isRecommended = isRecommended === 'true';
    
    // Search filter
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { ingredients: { $regex: search, $options: 'i' } },
        { tags: { $regex: search, $options: 'i' } }
      ];
    }
    
    // Price range filter
    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = parseFloat(minPrice);
      if (maxPrice) query.price.$lte = parseFloat(maxPrice);
    }
    
    // Sort options
    const sortOptions = {};
    sortOptions[sortBy] = order === 'desc' ? -1 : 1;
    
    // Get menu items with pagination
    const [menuItems, total] = await Promise.all([
      Menu.find(query)
        .sort(sortOptions)
        .skip(skip)
        .limit(limit),
      Menu.countDocuments(query)
    ]);
    
    // Get categories for filter
    const categories = await Menu.distinct('category');
    
    // Get price range
    const priceRange = await Menu.aggregate([
      {
        $group: {
          _id: null,
          minPrice: { $min: '$price' },
          maxPrice: { $max: '$price' }
        }
      }
    ]);
    
    res.status(200).json({
      success: true,
      data: {
        menuItems,
        categories,
        priceRange: priceRange[0] || { minPrice: 0, maxPrice: 0 },
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get all menu items error:', error);
    res.status(500).json({
      success: false,
      message: 'Menyu elementlarini olishda xatolik'
    });
  }
};

// Get menu item by ID
exports.getMenuItemById = async (req, res) => {
  try {
    const menuItem = await Menu.findById(req.params.id);
    
    if (!menuItem) {
      return res.status(404).json({
        success: false,
        message: 'Menyu elementi topilmadi'
      });
    }
    
    // Increment view count
    menuItem.orderCount += 1;
    await menuItem.save();
    
    res.status(200).json({
      success: true,
      data: { menuItem }
    });
  } catch (error) {
    console.error('Get menu item by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Menyu elementini olishda xatolik'
    });
  }
};

// Create menu item
exports.createMenuItem = async (req, res) => {
  try {
    const menuData = req.body;
    
    // Handle image upload
    if (req.file) {
      try {
        // Upload to Cloudinary
        const result = await cloudinary.uploader.upload(req.file.path, {
          folder: 'bukhara-rest/menu',
          width: 800,
          height: 600,
          crop: 'fill'
        });
        
        // Add image URL to menu data
        menuData.image = result.secure_url;
        menuData.images = [result.secure_url];
        
        // Delete temporary file
        fs.unlinkSync(req.file.path);
      } catch (uploadError) {
        console.error('Image upload error:', uploadError);
        // Continue without image if upload fails
      }
    }
    
    // Set createdBy
    menuData.createdBy = req.user.id;
    
    // Create menu item
    const menuItem = await Menu.create(menuData);
    
    res.status(201).json({
      success: true,
      message: 'Menyu elementi muvaffaqiyatli yaratildi',
      data: { menuItem }
    });
  } catch (error) {
    console.error('Create menu item error:', error);
    
    // Clean up uploaded file if exists
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    res.status(500).json({
      success: false,
      message: 'Menyu elementi yaratishda xatolik'
    });
  }
};

// Update menu item
exports.updateMenuItem = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    // Handle image upload
    if (req.file) {
      try {
        // Upload to Cloudinary
        const result = await cloudinary.uploader.upload(req.file.path, {
          folder: 'bukhara-rest/menu',
          width: 800,
          height: 600,
          crop: 'fill'
        });
        
        // Add image URL to update data
        updateData.image = result.secure_url;
        if (!updateData.images) {
          updateData.images = [];
        }
        updateData.images.push(result.secure_url);
        
        // Delete temporary file
        fs.unlinkSync(req.file.path);
      } catch (uploadError) {
        console.error('Image upload error:', uploadError);
        // Continue without image if upload fails
      }
    }
    
    // Set updatedBy
    updateData.updatedBy = req.user.id;
    
    // Update menu item
    const menuItem = await Menu.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );
    
    if (!menuItem) {
      return res.status(404).json({
        success: false,
        message: 'Menyu elementi topilmadi'
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Menyu elementi muvaffaqiyatli yangilandi',
      data: { menuItem }
    });
  } catch (error) {
    console.error('Update menu item error:', error);
    
    // Clean up uploaded file if exists
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    res.status(500).json({
      success: false,
      message: 'Menyu elementini yangilashda xatolik'
    });
  }
};

// Delete menu item
exports.deleteMenuItem = async (req, res) => {
  try {
    const { id } = req.params;
    
    const menuItem = await Menu.findByIdAndDelete(id);
    
    if (!menuItem) {
      return res.status(404).json({
        success: false,
        message: 'Menyu elementi topilmadi'
      });
    }
    
    // Delete image from Cloudinary if exists
    if (menuItem.image) {
      try {
        const publicId = menuItem.image.split('/').pop().split('.')[0];
        await cloudinary.uploader.destroy(`bukhara-rest/menu/${publicId}`);
      } catch (cloudinaryError) {
        console.error('Cloudinary delete error:', cloudinaryError);
      }
    }
    
    res.status(200).json({
      success: true,
      message: 'Menyu elementi muvaffaqiyatli o\'chirildi'
    });
  } catch (error) {
    console.error('Delete menu item error:', error);
    res.status(500).json({
      success: false,
      message: 'Menyu elementini o\'chirishda xatolik'
    });
  }
};

// Upload multiple images for menu item
exports.uploadImages = async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Rasmlar yuklanishi kerak'
      });
    }
    
    const menuItem = await Menu.findById(id);
    if (!menuItem) {
      return res.status(404).json({
        success: false,
        message: 'Menyu elementi topilmadi'
      });
    }
    
    const uploadedImages = [];
    
    // Upload each image to Cloudinary
    for (const file of req.files) {
      try {
        const result = await cloudinary.uploader.upload(file.path, {
          folder: 'bukhara-rest/menu',
          width: 800,
          height: 600,
          crop: 'fill'
        });
        
        uploadedImages.push(result.secure_url);
        
        // Delete temporary file
        fs.unlinkSync(file.path);
      } catch (uploadError) {
        console.error('Image upload error:', uploadError);
      }
    }
    
    // Update menu item with new images
    menuItem.images = [...(menuItem.images || []), ...uploadedImages];
    
    // Set first image as main image if not set
    if (!menuItem.image && uploadedImages.length > 0) {
      menuItem.image = uploadedImages[0];
    }
    
    await menuItem.save();
    
    res.status(200).json({
      success: true,
      message: `${uploadedImages.length} ta rasm muvaffaqiyatli yuklandi`,
      data: { images: uploadedImages }
    });
  } catch (error) {
    console.error('Upload images error:', error);
    
    // Clean up uploaded files if exist
    if (req.files) {
      req.files.forEach(file => {
        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Rasmlarni yuklashda xatolik'
    });
  }
};

// Get menu items by category
exports.getByCategory = async (req, res) => {
  try {
    const { category } = req.params;
    
    const menuItems = await Menu.getByCategory(category);
    
    res.status(200).json({
      success: true,
      data: { menuItems, category }
    });
  } catch (error) {
    console.error('Get by category error:', error);
    res.status(500).json({
      success: false,
      message: 'Kategoriya bo\'yicha menyu elementlarini olishda xatolik'
    });
  }
};

// Get popular menu items
exports.getPopularItems = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    
    const popularItems = await Menu.getPopularItems(limit);
    
    res.status(200).json({
      success: true,
      data: { popularItems }
    });
  } catch (error) {
    console.error('Get popular items error:', error);
    res.status(500).json({
      success: false,
      message: 'Mashhur menyu elementlarini olishda xatolik'
    });
  }
};

// Get recommended menu items
exports.getRecommendedItems = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    
    const recommendedItems = await Menu.getRecommendedItems(limit);
    
    res.status(200).json({
      success: true,
      data: { recommendedItems }
    });
  } catch (error) {
    console.error('Get recommended items error:', error);
    res.status(500).json({
      success: false,
      message: 'Tavsiya etilgan menyu elementlarini olishda xatolik'
    });
  }
};

// Update menu item rating
exports.updateRating = async (req, res) => {
  try {
    const { id } = req.params;
    const { rating } = req.body;
    
    if (rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        message: 'Reyting 1 dan 5 gacha bo\'lishi kerak'
      });
    }
    
    const menuItem = await Menu.findById(id);
    if (!menuItem) {
      return res.status(404).json({
        success: false,
        message: 'Menyu elementi topilmadi'
      });
    }
    
    // Calculate new average rating
    const currentTotal = menuItem.averageRating * menuItem.ratingCount;
    const newTotal = currentTotal + rating;
    const newCount = menuItem.ratingCount + 1;
    const newAverage = newTotal / newCount;
    
    // Update menu item
    menuItem.averageRating = newAverage;
    menuItem.ratingCount = newCount;
    await menuItem.save();
    
    res.status(200).json({
      success: true,
      message: 'Reyting muvaffaqiyatli yangilandi',
      data: {
        averageRating: newAverage,
        ratingCount: newCount
      }
    });
  } catch (error) {
    console.error('Update rating error:', error);
    res.status(500).json({
      success: false,
      message: 'Reytingni yangilashda xatolik'
    });
  }
};

// Search menu items
exports.searchMenuItems = async (req, res) => {
  try {
    const { q, category, minPrice, maxPrice, sortBy = 'name', order = 'asc' } = req.query;
    
    if (!q) {
      return res.status(400).json({
        success: false,
        message: 'Qidiruv so\'zi kiritilishi shart'
      });
    }
    
    // Build query
    let query = {
      isAvailable: true,
      $or: [
        { name: { $regex: q, $options: 'i' } },
        { description: { $regex: q, $options: 'i' } },
        { ingredients: { $regex: q, $options: 'i' } },
        { tags: { $regex: q, $options: 'i' } }
      ]
    };
    
    // Category filter
    if (category) {
      query.category = category;
    }
    
    // Price range filter
    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = parseFloat(minPrice);
      if (maxPrice) query.price.$lte = parseFloat(maxPrice);
    }
    
    // Sort options
    const sortOptions = {};
    sortOptions[sortBy] = order === 'desc' ? -1 : 1;
    
    const menuItems = await Menu.find(query)
      .sort(sortOptions)
      .limit(50);
    
    res.status(200).json({
      success: true,
      data: {
        query: q,
        results: menuItems,
        count: menuItems.length
      }
    });
  } catch (error) {
    console.error('Search menu items error:', error);
    res.status(500).json({
      success: false,
      message: 'Menyu elementlarini qidirishda xatolik'
    });
  }
};

// Get menu statistics
exports.getMenuStats = async (req, res) => {
  try {
    // Get category statistics
    const categoryStats = await Menu.aggregate([
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 },
          avgPrice: { $avg: '$price' },
          minPrice: { $min: '$price' },
          maxPrice: { $max: '$price' }
        }
      },
      {
        $sort: { count: -1 }
      }
    ]);
    
    // Get availability statistics
    const availabilityStats = await Menu.aggregate([
      {
        $group: {
          _id: '$isAvailable',
          count: { $sum: 1 }
        }
      }
    ]);
    
    // Get popular tags
    const tagStats = await Menu.aggregate([
      { $unwind: '$tags' },
      {
        $group: {
          _id: '$tags',
          count: { $sum: 1 }
        }
      },
      {
        $sort: { count: -1 }
      },
      {
        $limit: 10
      }
    ]);
    
    // Get top rated items
    const topRated = await Menu.find({
      ratingCount: { $gte: 5 }
    })
    .sort({ averageRating: -1 })
    .limit(10);
    
    res.status(200).json({
      success: true,
      data: {
        categoryStats,
        availabilityStats,
        tagStats,
        topRated,
        summary: {
          totalItems: await Menu.countDocuments(),
          availableItems: await Menu.countDocuments({ isAvailable: true }),
          popularItems: await Menu.countDocuments({ isPopular: true }),
          recommendedItems: await Menu.countDocuments({ isRecommended: true })
        }
      }
    });
  } catch (error) {
    console.error('Get menu stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Menyu statistikasini olishda xatolik'
    });
  }
};
