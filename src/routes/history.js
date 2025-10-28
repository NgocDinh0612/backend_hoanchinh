// routes/history.js
const express = require('express');
const router = express.Router();
const Command = require('../models/Command');
const ActivityLog = require('../models/ActivityLog');
const User = require('../models/User');
const Schedule = require('../models/Schedule');
const LightStatus = require('../models/LightStatus');
const { authenticate } = require('../middleware/auth');

// GET /api/commands: Lịch sử chỉnh đèn
router.get('/commands', authenticate, async (req, res) => {
  try {
    const data = await Command.find({}).sort({ createAt: -1 }).limit(100).lean();  // Thêm limit tránh overload
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/activitylogs: Lịch sử đăng nhập
router.get('/activitylogs', authenticate, async (req, res) => {
  try {
    const data = await ActivityLog.find({}).sort({ createAt: -1 }).limit(100).lean();
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/users: Lịch sử tạo người dùng
router.get('/users', authenticate, async (req, res) => {
  try {
    const data = await User.find({}).sort({ createdAt: -1 }).limit(100).lean();
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/schedules: Lịch sử đặt lịch
router.get('/schedules', authenticate, async (req, res) => {
  try {
    const data = await Schedule.find({}).sort({ createdAt: -1 }).limit(100).lean();
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Comment về /status/history: Đúng, nhưng bạn cần thêm vào routes/status.js (không phải ở đây)
module.exports = router;
