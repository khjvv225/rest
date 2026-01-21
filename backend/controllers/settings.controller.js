const Setting = require('../models/Setting');
const { sendEmail } = require('../utils/email.service');

// Get all settings
exports.getAllSettings = async (req, res) => {
  try {
    const { category, isPublic } = req.query;
    
    let query = {};
    if (category) query.category = category;
    if (isPublic !== undefined) query.isPublic = isPublic === 'true';
    
    const settings = await Setting.find(query).sort({ category: 1, sortOrder: 1 });
    
    // Group settings by category for easier consumption
    const groupedSettings = {};
    settings.forEach(setting => {
      if (!groupedSettings[setting.category]) {
        groupedSettings[setting.category] = [];
      }
      groupedSettings[setting.category].push(setting);
    });
    
    res.status(200).json({
      success: true,
      data: {
        settings,
        groupedSettings
      }
    });
  } catch (error) {
    console.error('Get all settings error:', error);
    res.status(500).json({
      success: false,
      message: 'Sozlamalarni olishda xatolik'
    });
  }
};

// Get setting by key
exports.getSettingByKey = async (req, res) => {
  try {
    const { key } = req.params;
    
    const setting = await Setting.findOne({ key: key.toUpperCase() });
    
    if (!setting) {
      return res.status(404).json({
        success: false,
        message: `Sozlama ${key} topilmadi`
      });
    }
    
    // Check if setting is public
    if (!setting.isPublic && !req.user) {
      return res.status(403).json({
        success: false,
        message: 'Bu sozlamaga kirish taqiqlangan'
      });
    }
    
    res.status(200).json({
      success: true,
      data: { setting }
    });
  } catch (error) {
    console.error('Get setting by key error:', error);
    res.status(500).json({
      success: false,
      message: 'Sozlamani olishda xatolik'
    });
  }
};

// Update setting
exports.updateSetting = async (req, res) => {
  try {
    const { key } = req.params;
    const { value, type } = req.body;
    
    // Find setting
    const setting = await Setting.findOne({ key: key.toUpperCase() });
    if (!setting) {
      return res.status(404).json({
        success: false,
        message: `Sozlama ${key} topilmadi`
      });
    }
    
    // Check if setting is editable
    if (!setting.isEditable) {
      return res.status(403).json({
        success: false,
        message: `Sozlama ${key} o'zgartirib bo'lmaydi`
      });
    }
    
    // Update setting
    setting.value = value;
    if (type) setting.type = type;
    setting.updatedBy = req.user.id;
    
    await setting.save();
    
    res.status(200).json({
      success: true,
      message: `Sozlama ${key} muvaffaqiyatli yangilandi`,
      data: { setting }
    });
  } catch (error) {
    console.error('Update setting error:', error);
    res.status(500).json({
      success: false,
      message: 'Sozlamani yangilashda xatolik'
    });
  }
};

// Update multiple settings
exports.updateMultipleSettings = async (req, res) => {
  try {
    const { settings } = req.body;
    
    if (!Array.isArray(settings) || settings.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Sozlamalar massiv shaklida bo\'lishi kerak'
      });
    }
    
    const updatedSettings = [];
    
    for (const settingData of settings) {
      const { key, value, type } = settingData;
      
      // Find setting
      const setting = await Setting.findOne({ key: key.toUpperCase() });
      if (!setting) {
        continue; // Skip non-existent settings
      }
      
      // Check if setting is editable
      if (!setting.isEditable) {
        continue;
      }
      
      // Update setting
      setting.value = value;
      if (type) setting.type = type;
      setting.updatedBy = req.user.id;
      
      await setting.save();
      updatedSettings.push(setting);
    }
    
    res.status(200).json({
      success: true,
      message: `${updatedSettings.length} ta sozlama yangilandi`,
      data: { updatedSettings }
    });
  } catch (error) {
    console.error('Update multiple settings error:', error);
    res.status(500).json({
      success: false,
      message: 'Sozlamalarni yangilashda xatolik'
    });
  }
};

// Create setting
exports.createSetting = async (req, res) => {
  try {
    const settingData = req.body;
    
    // Check if setting already exists
    const existingSetting = await Setting.findOne({ key: settingData.key.toUpperCase() });
    if (existingSetting) {
      return res.status(400).json({
        success: false,
        message: `Sozlama ${settingData.key} allaqachon mavjud`
      });
    }
    
    // Create setting
    settingData.key = settingData.key.toUpperCase();
    settingData.createdBy = req.user.id;
    
    const setting = await Setting.create(settingData);
    
    res.status(201).json({
      success: true,
      message: 'Sozlama muvaffaqiyatli yaratildi',
      data: { setting }
    });
  } catch (error) {
    console.error('Create setting error:', error);
    res.status(500).json({
      success: false,
      message: 'Sozlama yaratishda xatolik'
    });
  }
};

// Delete setting
exports.deleteSetting = async (req, res) => {
  try {
    const { key } = req.params;
    
    const setting = await Setting.findOne({ key: key.toUpperCase() });
    if (!setting) {
      return res.status(404).json({
        success: false,
        message: `Sozlama ${key} topilmadi`
      });
    }
    
    // Don't allow deletion of required settings
    if (setting.isRequired) {
      return res.status(403).json({
        success: false,
        message: `Sozlama ${key} zaruriy va o'chirib bo'lmaydi`
      });
    }
    
    await Setting.deleteOne({ key: key.toUpperCase() });
    
    res.status(200).json({
      success: true,
      message: 'Sozlama muvaffaqiyatli o\'chirildi'
    });
  } catch (error) {
    console.error('Delete setting error:', error);
    res.status(500).json({
      success: false,
      message: 'Sozlamani o\'chirishda xatolik'
    });
  }
};

// Initialize default settings
exports.initializeDefaults = async (req, res) => {
  try {
    await Setting.initializeDefaults();
    
    res.status(200).json({
      success: true,
      message: 'Standart sozlamalar muvaffaqiyatli yaratildi'
    });
  } catch (error) {
    console.error('Initialize defaults error:', error);
    res.status(500).json({
      success: false,
      message: 'Standart sozlamalarni yaratishda xatolik'
    });
  }
};

// Get public settings
exports.getPublicSettings = async (req, res) => {
  try {
    const settings = await Setting.getByCategory('restaurant', true);
    
    // Format as key-value pairs for easy consumption
    const settingsMap = {};
    settings.forEach(setting => {
      settingsMap[setting.key] = setting.value;
    });
    
    res.status(200).json({
      success: true,
      data: settingsMap
    });
  } catch (error) {
    console.error('Get public settings error:', error);
    res.status(500).json({
      success: false,
      message: 'Ommaviy sozlamalarni olishda xatolik'
    });
  }
};

// Test email configuration
exports.testEmailConfig = async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Test emaili kiritilishi shart'
      });
    }
    
    // Send test email
    await sendEmail({
      to: email,
      subject: 'BUKHARA REST - Email Konfiguratsiyasi Test',
      html: `
        <h2>Email Konfiguratsiyasi Test</h2>
        <p>Bu test emaili BUKHARA REST tizimidan yuborildi.</p>
        <p>Agar siz bu xabarni olayotgan bo'lsangiz, email konfiguratsiyasi to'g'ri ishlayapti.</p>
        <p>Vaqt: ${new Date().toLocaleString('uz-UZ')}</p>
        <p>Hurmat bilan,<br>BUKHARA REST jamoasi</p>
      `
    });
    
    res.status(200).json({
      success: true,
      message: 'Test emaili muvaffaqiyatli yuborildi'
    });
  } catch (error) {
    console.error('Test email config error:', error);
    res.status(500).json({
      success: false,
      message: 'Email konfiguratsiyasini test qilishda xatolik'
    });
  }
};

// Backup settings
exports.backupSettings = async (req, res) => {
  try {
    const allSettings = await Setting.find().lean();
    
    // Create backup file
    const backupData = {
      timestamp: new Date().toISOString(),
      count: allSettings.length,
      settings: allSettings
    };
    
    res.status(200).json({
      success: true,
      data: backupData
    });
  } catch (error) {
    console.error('Backup settings error:', error);
    res.status(500).json({
      success: false,
      message: 'Sozlamalarni zaxiralashda xatolik'
    });
  }
};

// Restore settings from backup
exports.restoreSettings = async (req, res) => {
  try {
    const { backupData } = req.body;
    
    if (!backupData || !backupData.settings || !Array.isArray(backupData.settings)) {
      return res.status(400).json({
        success: false,
        message: 'Yaroqli zaxira ma\'lumotlari talab etiladi'
      });
    }
    
    let restoredCount = 0;
    let skippedCount = 0;
    
    for (const settingData of backupData.settings) {
      try {
        // Check if setting exists
        const existingSetting = await Setting.findOne({ key: settingData.key });
        
        if (existingSetting) {
          // Update existing setting
          existingSetting.value = settingData.value;
          existingSetting.type = settingData.type;
          existingSetting.updatedBy = req.user.id;
          await existingSetting.save();
          restoredCount++;
        } else {
          // Create new setting
          await Setting.create({
            ...settingData,
            createdBy: req.user.id,
            updatedBy: req.user.id
          });
          restoredCount++;
        }
      } catch (settingError) {
        console.error(`Error restoring setting ${settingData.key}:`, settingError);
        skippedCount++;
      }
    }
    
    res.status(200).json({
      success: true,
      message: `Sozlamalar tiklandi: ${restoredCount} ta tiklandi, ${skippedCount} ta o'tkazib yuborildi`
    });
  } catch (error) {
    console.error('Restore settings error:', error);
    res.status(500).json({
      success: false,
      message: 'Sozlamalarni tiklashda xatolik'
    });
  }
};
