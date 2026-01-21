const Booking = require('../models/Booking');
const User = require('../models/User');
const Setting = require('../models/Setting');
const { sendEmail } = require('../utils/email.service');
const { sendSMS } = require('../utils/sms.service');

// Get all bookings with filters
exports.getAllBookings = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    
    const {
      status,
      dateFrom,
      dateTo,
      search,
      sortBy = 'date',
      order = 'asc'
    } = req.query;
    
    // Build query
    let query = {};
    
    // Status filter
    if (status) {
      query.status = status;
    }
    
    // Date range filter
    if (dateFrom || dateTo) {
      query.date = {};
      if (dateFrom) query.date.$gte = new Date(dateFrom);
      if (dateTo) query.date.$lte = new Date(dateTo);
    }
    
    // Search filter
    if (search) {
      query.$or = [
        { userName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } }
      ];
    }
    
    // Sort options
    const sortOptions = {};
    sortOptions[sortBy] = order === 'desc' ? -1 : 1;
    
    // Get bookings with pagination
    const [bookings, total] = await Promise.all([
      Booking.find(query)
        .sort(sortOptions)
        .skip(skip)
        .limit(limit)
        .populate('user', 'name email phone'),
      Booking.countDocuments(query)
    ]);
    
    // Get statistics
    const stats = await Booking.aggregate([
      {
        $match: query
      },
      {
        $group: {
          _id: null,
          totalGuests: { $sum: '$guests' },
          totalRevenue: { $sum: '$totalAmount' },
          averageGuests: { $avg: '$guests' }
        }
      }
    ]);
    
    res.status(200).json({
      success: true,
      data: {
        bookings,
        stats: stats[0] || { totalGuests: 0, totalRevenue: 0, averageGuests: 0 },
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get all bookings error:', error);
    res.status(500).json({
      success: false,
      message: 'Bronlarni olishda xatolik'
    });
  }
};

// Get booking by ID
exports.getBookingById = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate('user', 'name email phone');
    
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Bron topilmadi'
      });
    }
    
    res.status(200).json({
      success: true,
      data: { booking }
    });
  } catch (error) {
    console.error('Get booking by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Bronni olishda xatolik'
    });
  }
};

// Create booking (admin only)
exports.createBooking = async (req, res) => {
  try {
    const {
      userName,
      email,
      phone,
      date,
      time,
      guests,
      notes,
      specialRequirements,
      tableNumber,
      status = 'confirmed',
      source = 'admin'
    } = req.body;
    
    // Check if user exists, if not create one
    let user = await User.findOne({ email });
    if (!user) {
      user = await User.create({
        name: userName,
        email,
        phone,
        password: 'temporary' + Date.now() // Temporary password
      });
    }
    
    // Create booking
    const booking = await Booking.create({
      user: user._id,
      userName,
      email,
      phone,
      date: new Date(date),
      time,
      guests,
      notes,
      specialRequirements,
      tableNumber,
      status,
      source,
      metadata: {
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        device: req.headers['sec-ch-ua-platform'] || 'unknown'
      }
    });
    
    // Send confirmation notification
    if (status === 'confirmed') {
      await sendBookingConfirmation(booking, user);
    }
    
    res.status(201).json({
      success: true,
      message: 'Bron muvaffaqiyatli yaratildi',
      data: { booking }
    });
  } catch (error) {
    console.error('Create booking error:', error);
    res.status(500).json({
      success: false,
      message: 'Bron yaratishda xatolik'
    });
  }
};

// Update booking
exports.updateBooking = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    // Get current booking to check status change
    const currentBooking = await Booking.findById(id);
    if (!currentBooking) {
      return res.status(404).json({
        success: false,
        message: 'Bron topilmadi'
      });
    }
    
    // If status is changing, handle notifications
    if (updateData.status && updateData.status !== currentBooking.status) {
      updateData.updatedAt = new Date();
      
      // Get user for notification
      const user = await User.findById(currentBooking.user);
      
      // Send appropriate notification based on status change
      switch (updateData.status) {
        case 'confirmed':
          await sendBookingConfirmation({ ...currentBooking.toObject(), ...updateData }, user);
          updateData.confirmationSent = true;
          break;
        case 'cancelled':
          await sendBookingCancellation({ ...currentBooking.toObject(), ...updateData }, user);
          break;
      }
    }
    
    // Update booking
    const booking = await Booking.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    ).populate('user', 'name email phone');
    
    res.status(200).json({
      success: true,
      message: 'Bron muvaffaqiyatli yangilandi',
      data: { booking }
    });
  } catch (error) {
    console.error('Update booking error:', error);
    res.status(500).json({
      success: false,
      message: 'Bronni yangilashda xatolik'
    });
  }
};

// Delete booking
exports.deleteBooking = async (req, res) => {
  try {
    const { id } = req.params;
    
    const booking = await Booking.findByIdAndDelete(id);
    
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Bron topilmadi'
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Bron muvaffaqiyatli o\'chirildi'
    });
  } catch (error) {
    console.error('Delete booking error:', error);
    res.status(500).json({
      success: false,
      message: 'Bronni o\'chirishda xatolik'
    });
  }
};

// Get today's bookings
exports.getTodayBookings = async (req, res) => {
  try {
    const todayBookings = await Booking.getTodayBookings()
      .populate('user', 'name email phone')
      .sort({ time: 1 });
    
    // Group by time slot for better display
    const bookingsByTime = {};
    todayBookings.forEach(booking => {
      if (!bookingsByTime[booking.time]) {
        bookingsByTime[booking.time] = [];
      }
      bookingsByTime[booking.time].push(booking);
    });
    
    res.status(200).json({
      success: true,
      data: {
        bookings: todayBookings,
        groupedByTime: bookingsByTime,
        count: todayBookings.length
      }
    });
  } catch (error) {
    console.error('Get today bookings error:', error);
    res.status(500).json({
      success: false,
      message: 'Bugungi bronlarni olishda xatolik'
    });
  }
};

// Get upcoming bookings
exports.getUpcomingBookings = async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 7;
    
    const upcomingBookings = await Booking.getUpcomingBookings(days)
      .populate('user', 'name email phone')
      .sort({ date: 1, time: 1 });
    
    // Group by date for better display
    const bookingsByDate = {};
    upcomingBookings.forEach(booking => {
      const dateStr = booking.date.toISOString().split('T')[0];
      if (!bookingsByDate[dateStr]) {
        bookingsByDate[dateStr] = [];
      }
      bookingsByDate[dateStr].push(booking);
    });
    
    res.status(200).json({
      success: true,
      data: {
        bookings: upcomingBookings,
        groupedByDate: bookingsByDate,
        count: upcomingBookings.length
      }
    });
  } catch (error) {
    console.error('Get upcoming bookings error:', error);
    res.status(500).json({
      success: false,
      message: 'Kelgusi bronlarni olishda xatolik'
    });
  }
};

// Check table availability
exports.checkAvailability = async (req, res) => {
  try {
    const { date, time, guests, excludeBookingId } = req.body;
    
    // Get max capacity from settings
    const maxCapacity = await Setting.getByKey('MAX_TABLE_CAPACITY') || 100;
    const tableCount = await Setting.getByKey('TABLE_COUNT') || 20;
    
    // Calculate available tables
    const queryDate = new Date(date);
    
    // Get bookings for the specified time
    const existingBookings = await Booking.find({
      date: queryDate,
      time: time,
      status: { $in: ['pending', 'confirmed'] },
      _id: { $ne: excludeBookingId }
    });
    
    // Calculate total guests already booked
    const totalBookedGuests = existingBookings.reduce((sum, booking) => sum + booking.guests, 0);
    
    // Check if there's capacity
    const isAvailable = (totalBookedGuests + guests) <= maxCapacity;
    
    // Calculate remaining capacity
    const remainingCapacity = maxCapacity - totalBookedGuests;
    
    // Find available table numbers
    const allTables = Array.from({ length: tableCount }, (_, i) => i + 1);
    const bookedTables = existingBookings.map(b => b.tableNumber).filter(Boolean);
    const availableTables = allTables.filter(table => !bookedTables.includes(table));
    
    res.status(200).json({
      success: true,
      data: {
        isAvailable,
        totalBookedGuests,
        remainingCapacity,
        availableTables: availableTables.slice(0, Math.ceil(guests / 4)), // Assuming 4 guests per table
        suggestedTables: availableTables.slice(0, 3)
      }
    });
  } catch (error) {
    console.error('Check availability error:', error);
    res.status(500).json({
      success: false,
      message: 'Stol mavjudligini tekshirishda xatolik'
    });
  }
};

// Send booking reminder
exports.sendReminder = async (req, res) => {
  try {
    const { id } = req.params;
    
    const booking = await Booking.findById(id).populate('user');
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Bron topilmadi'
      });
    }
    
    // Check if reminder was already sent
    if (booking.reminderSent) {
      return res.status(400).json({
        success: false,
        message: 'Eslatma allaqachon yuborilgan'
      });
    }
    
    // Send reminder email
    await sendEmail({
      to: booking.email,
      subject: 'BUKHARA REST - Bron Eslatmasi',
      html: `
        <h2>Bron Eslatmasi</h2>
        <p>Hurmatli ${booking.userName},</p>
        <p>Sizning broningiz haqida eslatma:</p>
        <ul>
          <li><strong>Sana:</strong> ${booking.date.toLocaleDateString('uz-UZ')}</li>
          <li><strong>Vaqt:</strong> ${booking.time}</li>
          <li><strong>Mehmonlar:</strong> ${booking.guests} kishi</li>
          ${booking.tableNumber ? `<li><strong>Stol raqami:</strong> ${booking.tableNumber}</li>` : ''}
        </ul>
        <p>Kechikmasdan kelishingizni so\'raymiz.</p>
        <p>Agar rejalaringiz o\'zgarsa, iltimos, bizga xabar bering.</p>
        <p>Hurmat bilan,<br>BUKHARA REST jamoasi</p>
      `
    });
    
    // Send SMS reminder if enabled
    const smsEnabled = await Setting.getByKey('SMS_NOTIFICATIONS');
    if (smsEnabled && booking.phone) {
      await sendSMS({
        to: booking.phone,
        message: `BUKHARA REST: Bron eslatmasi. Sana: ${booking.date.toLocaleDateString('uz-UZ')}, Vaqt: ${booking.time}, Mehmonlar: ${booking.guests}`
      });
    }
    
    // Update booking
    booking.reminderSent = true;
    await booking.save();
    
    res.status(200).json({
      success: true,
      message: 'Bron eslatmasi muvaffaqiyatli yuborildi'
    });
  } catch (error) {
    console.error('Send reminder error:', error);
    res.status(500).json({
      success: false,
      message: 'Eslatma yuborishda xatolik'
    });
  }
};

// Get booking statistics
exports.getBookingStats = async (req, res) => {
  try {
    const { period = 'month', year, month } = req.query;
    
    let startDate, endDate;
    const now = new Date();
    
    switch (period) {
      case 'today':
        startDate = new Date(now.setHours(0, 0, 0, 0));
        endDate = new Date(now.setHours(23, 59, 59, 999));
        break;
      case 'week':
        startDate = new Date(now.setDate(now.getDate() - 7));
        endDate = new Date();
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        endDate = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
        break;
      case 'custom':
        if (year && month) {
          startDate = new Date(year, month - 1, 1);
          endDate = new Date(year, month, 0, 23, 59, 59, 999);
        } else {
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
        }
        break;
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    }
    
    // Get statistics by status
    const statsByStatus = await Booking.aggregate([
      {
        $match: {
          date: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalGuests: { $sum: '$guests' },
          totalRevenue: { $sum: '$totalAmount' }
        }
      },
      {
        $sort: { count: -1 }
      }
    ]);
    
    // Get daily statistics for the period
    const dailyStats = await Booking.aggregate([
      {
        $match: {
          date: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$date' } },
          count: { $sum: 1 },
          guests: { $sum: '$guests' },
          revenue: { $sum: '$totalAmount' }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ]);
    
    // Get top customers
    const topCustomers = await Booking.aggregate([
      {
        $match: {
          date: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: '$user',
          bookingsCount: { $sum: 1 },
          totalGuests: { $sum: '$guests' },
          totalSpent: { $sum: '$totalAmount' }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'userInfo'
        }
      },
      {
        $unwind: '$userInfo'
      },
      {
        $project: {
          name: '$userInfo.name',
          email: '$userInfo.email',
          phone: '$userInfo.phone',
          bookingsCount: 1,
          totalGuests: 1,
          totalSpent: 1
        }
      },
      {
        $sort: { bookingsCount: -1 }
      },
      {
        $limit: 10
      }
    ]);
    
    res.status(200).json({
      success: true,
      data: {
        period: {
          start: startDate,
          end: endDate
        },
        statsByStatus,
        dailyStats,
        topCustomers,
        summary: {
          totalBookings: statsByStatus.reduce((sum, stat) => sum + stat.count, 0),
          totalGuests: statsByStatus.reduce((sum, stat) => sum + stat.totalGuests, 0),
          totalRevenue: statsByStatus.reduce((sum, stat) => sum + stat.totalRevenue, 0)
        }
      }
    });
  } catch (error) {
    console.error('Get booking stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Bron statistikasini olishda xatolik'
    });
  }
};

// Helper function to send booking confirmation
async function sendBookingConfirmation(booking, user) {
  try {
    // Send email confirmation
    await sendEmail({
      to: booking.email,
      subject: 'BUKHARA REST - Bron Tasdiqlandi',
      html: `
        <h2>Bron Tasdiqlandi</h2>
        <p>Hurmatli ${booking.userName},</p>
        <p>Sizning broningiz muvaffaqiyatli tasdiqlandi.</p>
        <h3>Bron Tafsilotlari:</h3>
        <ul>
          <li><strong>Bron raqami:</strong> ${booking._id.toString().substring(0, 8)}</li>
          <li><strong>Sana:</strong> ${new Date(booking.date).toLocaleDateString('uz-UZ')}</li>
          <li><strong>Vaqt:</strong> ${booking.time}</li>
          <li><strong>Mehmonlar:</strong> ${booking.guests} kishi</li>
          ${booking.tableNumber ? `<li><strong>Stol raqami:</strong> ${booking.tableNumber}</li>` : ''}
          ${booking.notes ? `<li><strong>Izoh:</strong> ${booking.notes}</li>` : ''}
        </ul>
        <p><strong>Muhim eslatma:</strong></p>
        <ul>
          <li>Iltimos, bron vaqtidan 15 daqiqa oldin kelishingizni tavsiya qilamiz</li>
          <li>Kechikish holatida stolingiz boshqa mijozga berilishi mumkin</li>
          <li>Bronni bekor qilish uchun kamida 2 soat oldin xabar bering</li>
        </ul>
        <p>Hurmat bilan,<br>BUKHARA REST jamoasi</p>
        <p>Telefon: +998 90 123 45 67</p>
      `
    });
    
    // Send SMS confirmation if enabled
    const Setting = require('../models/Setting');
    const smsEnabled = await Setting.getByKey('SMS_NOTIFICATIONS');
    if (smsEnabled && booking.phone) {
      const { sendSMS } = require('../utils/sms.service');
      await sendSMS({
        to: booking.phone,
        message: `BUKHARA REST: Broningiz tasdiqlandi. Sana: ${new Date(booking.date).toLocaleDateString('uz-UZ')}, Vaqt: ${booking.time}, Mehmonlar: ${booking.guests}. Rahmat!`
      });
    }
  } catch (error) {
    console.error('Send booking confirmation error:', error);
  }
}

// Helper function to send booking cancellation
async function sendBookingCancellation(booking, user) {
  try {
    await sendEmail({
      to: booking.email,
      subject: 'BUKHARA REST - Bron Bekor Qilindi',
      html: `
        <h2>Bron Bekor Qilindi</h2>
        <p>Hurmatli ${booking.userName},</p>
        <p>Sizning broningiz bekor qilindi.</p>
        <p><strong>Bekor qilingan bron tafsilotlari:</strong></p>
        <ul>
          <li><strong>Sana:</strong> ${new Date(booking.date).toLocaleDateString('uz-UZ')}</li>
          <li><strong>Vaqt:</strong> ${booking.time}</li>
          <li><strong>Mehmonlar:</strong> ${booking.guests} kishi</li>
        </ul>
        <p>Yana bir bor bizni tanlaganingiz uchun rahmat.</p>
        <p>Yangi bron qilish uchun: ${process.env.FRONTEND_URL}/booking</p>
        <p>Hurmat bilan,<br>BUKHARA REST jamoasi</p>
      `
    });
  } catch (error) {
    console.error('Send booking cancellation error:', error);
  }
}
