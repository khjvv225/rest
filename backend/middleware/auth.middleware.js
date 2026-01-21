const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');
const User = require('../models/User');

// Protect routes - requires authentication
exports.protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies?.token) {
    token = req.cookies.token;
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Autentifikatsiya talab etiladi. Iltimos, tizimga kiring.'
    });
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Check if token is expired
    if (decoded.exp < Date.now() / 1000) {
      return res.status(401).json({
        success: false,
        message: 'Token muddati tugagan. Qaytadan kiring.'
      });
    }

    // Get user from token
    let user;
    if (decoded.role === 'admin') {
      user = await Admin.findById(decoded.id).select('-password');
    } else {
      user = await User.findById(decoded.id).select('-password');
    }

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Foydalanuvchi topilmadi.'
      });
    }

    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Foydalanuvchi bloklangan. Administrator bilan bog\'laning.'
      });
    }

    req.user = user;
    req.user.role = decoded.role;
    next();
  } catch (error) {
    console.error('Auth middleware error:', error.message);
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Yaroqsiz token. Qaytadan kiring.'
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token muddati tugagan. Qaytadan kiring.'
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Server xatosi. Iltimos, keyinroq urinib ko\'ring.'
    });
  }
};

// Admin only middleware
exports.adminOnly = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Ruxsat etilmagan. Faqat adminlar kirishi mumkin.'
    });
  }
  next();
};

// Superadmin only middleware
exports.superAdminOnly = (req, res, next) => {
  if (!req.user || req.user.role !== 'superadmin') {
    return res.status(403).json({
      success: false,
      message: 'Ruxsat etilmagan. Faqat superadminlar kirishi mumkin.'
    });
  }
  next();
};

// Role-based access control
exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Foydalanuvchi roli ${roles.join(', ')} ga ruxsat berilmagan.`
      });
    }
    next();
  };
};

// Check permission middleware
exports.checkPermission = (module, action) => {
  return async (req, res, next) => {
    try {
      if (req.user.role === 'superadmin') {
        return next();
      }

      const admin = await Admin.findById(req.user.id).select('permissions');
      
      if (!admin) {
        return res.status(403).json({
          success: false,
          message: 'Ruxsat etilmagan.'
        });
      }

      const hasPermission = admin.hasPermission(module, action);
      
      if (!hasPermission) {
        return res.status(403).json({
          success: false,
          message: `Bu amalni bajarish uchun ruxsat yo'q.`
        });
      }

      next();
    } catch (error) {
      console.error('Permission check error:', error);
      return res.status(500).json({
        success: false,
        message: 'Server xatosi.'
      });
    }
  };
};

// Rate limiting for login attempts
exports.loginRateLimit = (req, res, next) => {
  const maxAttempts = 5;
  const windowMs = 15 * 60 * 1000; // 15 minutes
  
  // Simple in-memory rate limiting (in production, use Redis)
  const ip = req.ip;
  const now = Date.now();
  
  if (!req.loginAttempts) {
    req.loginAttempts = {};
  }
  
  if (!req.loginAttempts[ip]) {
    req.loginAttempts[ip] = {
      attempts: 0,
      firstAttempt: now,
      resetTime: now + windowMs
    };
  }
  
  const userAttempts = req.loginAttempts[ip];
  
  // Reset if window has passed
  if (now > userAttempts.resetTime) {
    userAttempts.attempts = 0;
    userAttempts.firstAttempt = now;
    userAttempts.resetTime = now + windowMs;
  }
  
  // Check if exceeded max attempts
  if (userAttempts.attempts >= maxAttempts) {
    const retryAfter = Math.ceil((userAttempts.resetTime - now) / 1000);
    
    return res.status(429).json({
      success: false,
      message: `Juda ko'p urinishlar. Iltimos, ${retryAfter} soniyadan keyin qayta urinib ko'ring.`
    });
  }
  
  userAttempts.attempts++;
  next();
};

// Generate JWT token
exports.generateToken = (user, role = 'user') => {
  const payload = {
    id: user._id,
    email: user.email,
    role: role,
    username: user.username || user.name
  };

  const token = jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  });

  const refreshToken = jwt.sign(
    { id: user._id },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d' }
  );

  return { token, refreshToken };
};

// Verify refresh token
exports.verifyRefreshToken = async (refreshToken) => {
  try {
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    
    let user;
    if (decoded.role === 'admin') {
      user = await Admin.findById(decoded.id);
    } else {
      user = await User.findById(decoded.id);
    }
    
    if (!user) {
      throw new Error('Foydalanuvchi topilmadi');
    }
    
    return user;
  } catch (error) {
    throw new Error('Yaroqsiz refresh token');
  }
};
