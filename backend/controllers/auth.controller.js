const User = require('../models/User');
const Admin = require('../models/Admin');
const { generateToken, verifyRefreshToken } = require('../middleware/auth.middleware');
const { sendEmail } = require('../utils/email.service');
const crypto = require('crypto');

// Register new user
exports.register = async (req, res) => {
  try {
    const { name, email, phone, password } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Bu email allaqachon ro\'yxatdan o\'tgan'
      });
    }

    // Create new user
    const user = await User.create({
      name,
      email,
      phone,
      password
    });

    // Generate email verification token
    const verificationToken = user.generateEmailVerificationToken();
    await user.save();

    // Send verification email
    const verificationUrl = `${process.env.FRONTEND_URL}/verify-email?token=${verificationToken}`;
    
    await sendEmail({
      to: user.email,
      subject: 'BUKHARA REST - Emailni Tasdiqlash',
      html: `
        <h2>Emailni Tasdiqlash</h2>
        <p>Hurmatli ${user.name},</p>
        <p>BUKHARA REST tizimida ro'yxatdan o'tganingiz uchun rahmat.</p>
        <p>Email manzilingizni tasdiqlash uchun quyidagi havolani bosing:</p>
        <a href="${verificationUrl}" style="display: inline-block; padding: 10px 20px; background: #d4a574; color: white; text-decoration: none; border-radius: 5px;">
          Emailni Tasdiqlash
        </a>
        <p>Agar siz bu xabarni noto'g'ri olgan bo'lsangiz, uni e'tiborsiz qoldiring.</p>
        <p>Hurmat bilan,<br>BUKHARA REST jamoasi</p>
      `
    });

    // Generate token
    const token = generateToken(user);

    // Remove password from response
    user.password = undefined;

    res.status(201).json({
      success: true,
      message: 'Muvaffaqiyatli ro\'yxatdan o\'tdingiz. Tasdiqlash emaili yuborildi.',
      data: {
        user,
        token: token.token,
        refreshToken: token.refreshToken
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Ro\'yxatdan o\'tishda xatolik yuz berdi'
    });
  }
};

// Login user
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check if user exists
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Email yoki parol noto\'g\'ri'
      });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Foydalanuvchi bloklangan. Administrator bilan bog\'laning.'
      });
    }

    // Check password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Email yoki parol noto\'g\'ri'
      });
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Generate token
    const token = generateToken(user);

    // Remove password from response
    user.password = undefined;

    res.status(200).json({
      success: true,
      message: 'Muvaffaqiyatli kirdingiz',
      data: {
        user,
        token: token.token,
        refreshToken: token.refreshToken
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Kirishda xatolik yuz berdi'
    });
  }
};

// Admin login
exports.adminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check if admin exists
    const admin = await Admin.findOne({ email }).select('+password');
    if (!admin) {
      return res.status(401).json({
        success: false,
        message: 'Email yoki parol noto\'g\'ri'
      });
    }

    // Check if admin is active
    if (!admin.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Admin bloklangan. Superadmin bilan bog\'laning.'
      });
    }

    // Check if admin is locked
    if (admin.isLocked) {
      return res.status(401).json({
        success: false,
        message: 'Hisob bloklangan. Iltimos, keyinroq urinib ko\'ring.'
      });
    }

    // Check password
    const isPasswordValid = await admin.comparePassword(password);
    if (!isPasswordValid) {
      // Increment login attempts
      await admin.incrementLoginAttempts();
      
      return res.status(401).json({
        success: false,
        message: 'Email yoki parol noto\'g\'ri'
      });
    }

    // Reset login attempts on successful login
    await admin.resetLoginAttempts();

    // Update last login
    admin.lastLogin = new Date();
    admin.lastLoginIp = req.ip;
    await admin.save();

    // Generate token with admin role
    const token = generateToken(admin, 'admin');

    // Remove password from response
    admin.password = undefined;
    admin.twoFactorSecret = undefined;

    res.status(200).json({
      success: true,
      message: 'Admin sifatida muvaffaqiyatli kirdingiz',
      data: {
        admin,
        token: token.token,
        refreshToken: token.refreshToken
      }
    });
  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({
      success: false,
      message: 'Admin kirishida xatolik yuz berdi'
    });
  }
};

// Refresh token
exports.refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        message: 'Refresh token talab etiladi'
      });
    }

    const user = await verifyRefreshToken(refreshToken);
    const token = generateToken(user, user.role);

    res.status(200).json({
      success: true,
      data: {
        token: token.token,
        refreshToken: token.refreshToken
      }
    });
  } catch (error) {
    console.error('Refresh token error:', error);
    res.status(401).json({
      success: false,
      message: 'Yaroqsiz refresh token'
    });
  }
};

// Forgot password
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    // Check if user exists
    const user = await User.findOne({ email });
    if (!user) {
      // For security, don't reveal if user exists
      return res.status(200).json({
        success: true,
        message: 'Agar bu email ro\'yxatdan o\'tgan bo\'lsa, parolni tiklash havolasi yuborildi'
      });
    }

    // Generate reset token
    const resetToken = user.generateResetPasswordToken();
    await user.save();

    // Send reset email
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
    
    await sendEmail({
      to: user.email,
      subject: 'BUKHARA REST - Parolni Tiklash',
      html: `
        <h2>Parolni Tiklash</h2>
        <p>Hurmatli ${user.name},</p>
        <p>Parolni tiklash uchun so'rov qabul qilindi.</p>
        <p>Parolni tiklash uchun quyidagi havolani bosing:</p>
        <a href="${resetUrl}" style="display: inline-block; padding: 10px 20px; background: #d4a574; color: white; text-decoration: none; border-radius: 5px;">
          Parolni Tiklash
        </a>
        <p>Bu havola 10 daqiqadan keyin amal qilishni to'xtatadi.</p>
        <p>Agar siz bu so'rovni yubormagan bo'lsangiz, bu xabarni e'tiborsiz qoldiring.</p>
        <p>Hurmat bilan,<br>BUKHARA REST jamoasi</p>
      `
    });

    res.status(200).json({
      success: true,
      message: 'Parolni tiklash havolasi emailga yuborildi'
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({
      success: false,
      message: 'Parolni tiklash so\'rovida xatolik yuz berdi'
    });
  }
};

// Reset password
exports.resetPassword = async (req, res) => {
  try {
    const { token, password } = req.body;

    // Hash token
    const resetPasswordToken = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');

    // Find user with valid reset token
    const user = await User.findOne({
      resetPasswordToken,
      resetPasswordExpire: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Yaroqsiz yoki muddati o\'tgan token'
      });
    }

    // Set new password
    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();

    // Send confirmation email
    await sendEmail({
      to: user.email,
      subject: 'BUKHARA REST - Parol Muvaffaqiyatli O\'zgartirildi',
      html: `
        <h2>Parol O'zgartirildi</h2>
        <p>Hurmatli ${user.name},</p>
        <p>Sizning parolingiz muvaffaqiyatli o'zgartirildi.</p>
        <p>Agar siz bu o'zgarishni amalga oshirmagan bo'lsangiz, darhol biz bilan bog'laning.</p>
        <p>Hurmat bilan,<br>BUKHARA REST jamoasi</p>
      `
    });

    res.status(200).json({
      success: true,
      message: 'Parol muvaffaqiyatli o\'zgartirildi'
    });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({
      success: false,
      message: 'Parolni tiklashda xatolik yuz berdi'
    });
  }
};

// Verify email
exports.verifyEmail = async (req, res) => {
  try {
    const { token } = req.query;

    // Hash token
    const emailVerificationToken = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');

    // Find user with valid verification token
    const user = await User.findOne({
      emailVerificationToken,
      emailVerificationExpire: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Yaroqsiz yoki muddati o\'tgan tasdiqlash tokeni'
      });
    }

    // Verify email
    user.emailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpire = undefined;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Email muvaffaqiyatli tasdiqlandi'
    });
  } catch (error) {
    console.error('Verify email error:', error);
    res.status(500).json({
      success: false,
      message: 'Emailni tasdiqlashda xatolik yuz berdi'
    });
  }
};

// Get current user
exports.getMe = async (req, res) => {
  try {
    let user;
    
    if (req.user.role === 'admin') {
      user = await Admin.findById(req.user.id);
    } else {
      user = await User.findById(req.user.id)
        .populate({
          path: 'bookings',
          options: { sort: { date: -1 }, limit: 5 }
        });
    }

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Foydalanuvchi topilmadi'
      });
    }

    // Remove sensitive data
    user.password = undefined;
    user.twoFactorSecret = undefined;

    res.status(200).json({
      success: true,
      data: { user }
    });
  } catch (error) {
    console.error('Get me error:', error);
    res.status(500).json({
      success: false,
      message: 'Foydalanuvchi ma\'lumotlarini olishda xatolik'
    });
  }
};

// Update profile
exports.updateProfile = async (req, res) => {
  try {
    const { name, phone } = req.body;
    const userId = req.user.id;
    const userRole = req.user.role;

    let user;
    if (userRole === 'admin') {
      user = await Admin.findById(userId);
    } else {
      user = await User.findById(userId);
    }

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Foydalanuvchi topilmadi'
      });
    }

    // Update fields
    if (name) user.name = name;
    if (phone) user.phone = phone;

    await user.save();

    // Remove sensitive data
    user.password = undefined;
    user.twoFactorSecret = undefined;

    res.status(200).json({
      success: true,
      message: 'Profil muvaffaqiyatli yangilandi',
      data: { user }
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Profilni yangilashda xatolik'
    });
  }
};

// Change password
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id;
    const userRole = req.user.role;

    let user;
    if (userRole === 'admin') {
      user = await Admin.findById(userId).select('+password');
    } else {
      user = await User.findById(userId).select('+password');
    }

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Foydalanuvchi topilmadi'
      });
    }

    // Check current password
    const isPasswordValid = await user.comparePassword(currentPassword);
    if (!isPasswordValid) {
      return res.status(400).json({
        success: false,
        message: 'Joriy parol noto\'g\'ri'
      });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    // Send notification email
    await sendEmail({
      to: user.email,
      subject: 'BUKHARA REST - Parol O\'zgartirildi',
      html: `
        <h2>Parol O'zgartirildi</h2>
        <p>Hurmatli ${user.name},</p>
        <p>Sizning hisobingiz paroli muvaffaqiyatli o'zgartirildi.</p>
        <p>Agar siz bu o'zgarishni amalga oshirmagan bo'lsangiz, darhol biz bilan bog'laning.</p>
        <p>Hurmat bilan,<br>BUKHARA REST jamoasi</p>
      `
    });

    res.status(200).json({
      success: true,
      message: 'Parol muvaffaqiyatli o\'zgartirildi'
    });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      success: false,
      message: 'Parolni o\'zgartirishda xatolik'
    });
  }
};

// Logout
exports.logout = (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Muvaffaqiyatli chiqdingiz'
  });
};
