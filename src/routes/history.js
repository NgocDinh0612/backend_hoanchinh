// routes/history.js  // Thêm file mới này vào backend/routes
const express = require('express');
const router = express.Router();
const Command = require('../models/Command');
const ActivityLog = require('../models/ActivityLog');
const User = require('../models/User');
const Schedule = require('../models/Schedule');
const LightStatus = require('../models/LightStatus');
const { authenticate } = require('../middleware/auth');  // Giả sử có auth

// GET /api/commands: Lịch sử chỉnh đèn
router.get('/commands', authenticate, async (req, res) => {
  try {
    const data = await Command.find({}).sort({ createdAt: -1 }).lean();
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/activitylogs: Lịch sử đăng nhập
router.get('/activitylogs', authenticate, async (req, res) => {
  try {
    const data = await ActivityLog.find({}).sort({ createAt: -1 }).lean();
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/users: Lịch sử tạo người dùng
router.get('/users', authenticate, async (req, res) => {
  try {
    const data = await User.find({}).sort({ createdAt: -1 }).lean();
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/schedules: Lịch sử đặt lịch
router.get('/schedules', authenticate, async (req, res) => {
  try {
    const data = await Schedule.find({}).sort({ createdAt: -1 }).lean();
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Đã có /status/history, nhưng nếu cần chỉnh, thêm param inf -> lấy all
// Giả sử chỉnh routes/status.js, thêm logic nếu periodMinutes='inf' thì bỏ filter time
// Trong routes/status.js, sửa phần query:
const startDate = periodMinutes === 'inf' ? new Date(0) : new Date(Date.now() - minutes * 60 * 1000);
// Và query: { createdAt: { $gte: startDate } } -> nếu inf, $gte: new Date(0) lấy all

module.exports = router;
