const Admin = require('../models/Admin');
const User = require('../models/User');
const Booking = require('../models/Booking');
const Menu = require('../models/Menu');
const Message = require('../models/Message');
const Setting = require('../models/Setting');
const { sendEmail } = require('../utils/email.service');

// Get dashboard statistics
exports.getDashboardStats = async (req, res) => {
  try {
    // Get counts
    const [
      totalUsers,
      totalBookings,
      totalMenuItems,
      totalMessages,
      todayBookings,
      pendingBookings,
      confirmedBookings,
      newMessages
    ] = await Promise.all([
      User.countDocuments(),
      Booking.countDocuments(),
      Menu.countDocuments(),
      Message.countDocuments(),
      Booking.getTodayBookings().countDocuments(),
      Booking.countDocuments({ status: 'pending' }),
      Booking.countDocuments({ status: 'confirmed' }),
      Message.countDocuments({ status: 'new' })
    ]);

    // Get recent bookings
    const recentBookings = await Booking.find()
      .sort({ createdAt: -1 })
      .limit(10)
      .populate('user', 'name email');

    // Get popular menu items
    const popularMenuItems = await Menu.getPopularItems(5);

    // Calculate revenue (example)
    const revenue = await Booking.aggregate([
      {
        $match: {
          status: 'confirmed',
          paymentStatus: 'paid'
        }
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$totalAmount' },
          totalPaid: { $sum: '$paidAmount' }
        }
      }
    ]);

    res.status(200).json({
      success: true,
      data: {
        stats: {
          totalUsers,
          totalBookings,
          totalMenuItems,
          totalMessages,
          todayBookings,
          pendingBookings,
          confirmedBookings,
          newMessages,
          totalRevenue: revenue[0]?.totalRevenue || 0,
          totalPaid: revenue[0]?.totalPaid || 0
        },
        recentBookings,
        popularMenuItems
      }
    });
  } catch (error) {
    console.error('Get dashboard stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Dashboard statistikasini olishda xatolik'
    });
  }
};

// Get all users with pagination
exports.getAllUsers = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    
    const search = req.query.search || '';
    const role = req.query.role;
    const isActive = req.query.isActive;
    
    // Build query
    let query = {};
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } }
      ];
    }
    
    if (role) query.role = role;
    if (isActive !== undefined) query.isActive = isActive === 'true';
    
    // Get users with pagination
    const [users, total] = await Promise.all([
      User.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .select('-password')
        .populate('bookingsCount'),
      User.countDocuments(query)
    ]);
    
    res.status(200).json({
      success: true,
      data: {
        users,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({
      success: false,
      message: 'Foydalanuvchilarni olishda xatolik'
    });
  }
};

// Get user by ID
exports.getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select('-password')
      .populate('bookings')
      .populate('favorites');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Foydalanuvchi topilmadi'
      });
    }
    
    res.status(200).json({
      success: true,
      data: { user }
    });
  } catch (error) {
    console.error('Get user by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Foydalanuvchini olishda xatolik'
    });
  }
};

// Update user
exports.updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    // Don't allow password update here
    if (updateData.password) {
      delete updateData.password;
    }
    
    const user = await User.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    ).select('-password');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Foydalanuvchi topilmadi'
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Foydalanuvchi muvaffaqiyatli yangilandi',
      data: { user }
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({
      success: false,
      message: 'Foydalanuvchini yangilashda xatolik'
    });
  }
};

// Delete user
exports.deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if user has bookings
    const hasBookings = await Booking.exists({ user: id });
    
    if (hasBookings) {
      // Soft delete: mark as inactive instead of deleting
      const user = await User.findByIdAndUpdate(
        id,
        { isActive: false },
        { new: true }
      );
      
      res.status(200).json({
        success: true,
        message: 'Foydalanuvchi bloklandi (soft delete)',
        data: { user }
      });
    } else {
      // Hard delete if no bookings
      const user = await User.findByIdAndDelete(id);
      
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'Foydalanuvchi topilmadi'
        });
      }
      
      res.status(200).json({
        success: true,
        message: 'Foydalanuvchi muvaffaqiyatli o\'chirildi'
      });
    }
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({
      success: false,
      message: 'Foydalanuvchini o\'chirishda xatolik'
    });
  }
};

// Get all admins
exports.getAllAdmins = async (req, res) => {
  try {
    const admins = await Admin.find()
      .select('-password -twoFactorSecret')
      .sort({ createdAt: -1 });
    
    res.status(200).json({
      success: true,
      data: { admins }
    });
  } catch (error) {
    console.error('Get all admins error:', error);
    res.status(500).json({
      success: false,
      message: 'Adminlarni olishda xatolik'
    });
  }
};

// Create admin
exports.createAdmin = async (req, res) => {
  try {
    const { username, email, password, fullName, role, permissions } = req.body;
    
    // Check if admin already exists
    const existingAdmin = await Admin.findOne({
      $or: [{ email }, { username }]
    });
    
    if (existingAdmin) {
      return res.status(400).json({
        success: false,
        message: 'Bu email yoki foydalanuvchi nomi allaqachon mavjud'
      });
    }
    
    // Create new admin
    const admin = await Admin.create({
      username,
      email,
      password,
      fullName,
      role: role || 'staff',
      permissions: permissions || [],
      createdBy: req.user.id
    });
    
    // Send welcome email
    await sendEmail({
      to: admin.email,
      subject: 'BUKHARA REST - Admin Hisobi Yaratildi',
      html: `
        <h2>Admin Hisobi Yaratildi</h2>
        <p>Hurmatli ${admin.fullName},</p>
        <p>Siz uchun BUKHARA REST tizimida admin hisobi yaratildi.</p>
        <p>Kirish ma\'lumotlari:</p>
        <ul>
          <li><strong>Email:</strong> ${admin.email}</li>
          <li><strong>Foydalanuvchi nomi:</strong> ${admin.username}</li>
          <li><strong>Parol:</strong> ${password}</li>
          <li><strong>Rol:</strong> ${admin.role}</li>
        </ul>
        <p>Kirish uchun: ${process.env.FRONTEND_URL}/admin</p>
        <p><strong>Parolni darhol o'zgartirishni tavsiya qilamiz.</strong></p>
        <p>Hurmat bilan,<br>BUKHARA REST jamoasi</p>
      `
    });
    
    // Remove sensitive data
    admin.password = undefined;
    admin.twoFactorSecret = undefined;
    
    res.status(201).json({
      success: true,
      message: 'Admin muvaffaqiyatli yaratildi',
      data: { admin }
    });
  } catch (error) {
    console.error('Create admin error:', error);
    res.status(500).json({
      success: false,
      message: 'Admin yaratishda xatolik'
    });
  }
};

// Update admin
exports.updateAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    // Don't allow certain updates
    delete updateData.password;
    delete updateData.email;
    delete updateData.username;
    
    // Only superadmin can update roles and permissions
    if (req.user.role !== 'superadmin') {
      delete updateData.role;
      delete updateData.permissions;
    }
    
    const admin = await Admin.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    ).select('-password -twoFactorSecret');
    
    if (!admin) {
      return res.status(404).json({
        success: false,
        message: 'Admin topilmadi'
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Admin muvaffaqiyatli yangilandi',
      data: { admin }
    });
  } catch (error) {
    console.error('Update admin error:', error);
    res.status(500).json({
      success: false,
      message: 'Adminni yangilashda xatolik'
    });
  }
};

// Delete admin
exports.deleteAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Don't allow self-deletion
    if (id === req.user.id) {
      return res.status(400).json({
        success: false,
        message: 'O\'zingizni o\'chira olmaysiz'
      });
    }
    
    // Don't allow deletion of superadmin
    const admin = await Admin.findById(id);
    if (admin && admin.role === 'superadmin') {
      return res.status(400).json({
        success: false,
        message: 'Superadminni o\'chirish mumkin emas'
      });
    }
    
    await Admin.findByIdAndDelete(id);
    
    res.status(200).json({
      success: true,
      message: 'Admin muvaffaqiyatli o\'chirildi'
    });
  } catch (error) {
    console.error('Delete admin error:', error);
    res.status(500).json({
      success: false,
      message: 'Adminni o\'chirishda xatolik'
    });
  }
};

// Get admin activity logs
exports.getActivityLogs = async (req, res) => {
  try {
    // This would typically come from a separate ActivityLog model
    // For now, we'll return recent admin logins
    const recentLogins = await Admin.find(
      { lastLogin: { $exists: true } },
      { fullName: 1, lastLogin: 1, lastLoginIp: 1, role: 1 }
    )
    .sort({ lastLogin: -1 })
    .limit(50);
    
    res.status(200).json({
      success: true,
      data: { logs: recentLogins }
    });
  } catch (error) {
    console.error('Get activity logs error:', error);
    res.status(500).json({
      success: false,
      message: 'Faollik loglarini olishda xatolik'
    });
  }
};

// Export data
exports.exportData = async (req, res) => {
  try {
    const { type, format = 'json' } = req.query;
    
    let data;
    
    switch (type) {
      case 'users':
        data = await User.find().select('-password');
        break;
      case 'bookings':
        data = await Booking.find().populate('user', 'name email phone');
        break;
      case 'menu':
        data = await Menu.find();
        break;
      case 'messages':
        data = await Message.find();
        break;
      default:
        return res.status(400).json({
          success: false,
          message: 'Yaroqsiz ma\'lumot turi'
        });
    }
    
    if (format === 'csv') {
      // Convert to CSV (simplified)
      const headers = Object.keys(data[0].toObject()).join(',');
      const rows = data.map(item => 
        Object.values(item.toObject()).map(val => 
          typeof val === 'string' ? `"${val}"` : val
        ).join(',')
      );
      
      const csv = [headers, ...rows].join('\n');
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=${type}_export.csv`);
      return res.send(csv);
    }
    
    res.status(200).json({
      success: true,
      data
    });
  } catch (error) {
    console.error('Export data error:', error);
    res.status(500).json({
      success: false,
      message: 'Ma\'lumotlarni eksport qilishda xatolik'
    });
  }
};
