const express = require('express');
const router = express.Router();
const axios = require('axios');
require('dotenv').config();
const { protect, adminOnly } = require('../middleware/auth.middleware');

// DeepSeek API endpoint
router.post('/', protect, adminOnly, async (req, res) => {
  try {
    const { prompt } = req.body;
    const response = await axios.post(
      'https://api.deepseek.com/v1/chat/completions',
      {
        model: 'deepseek-chat',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 512
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );
    res.json({ success: true, result: response.data.choices[0].message.content });
  } catch (err) {
    res.status(500).json({ success: false, message: 'DeepSeek API xatosi', error: err.message });
  }
});

module.exports = router;
