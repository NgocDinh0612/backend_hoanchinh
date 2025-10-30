// routes/schedule.js
const express = require('express');
const router = express.Router();
const Schedule = require('../models/schedule'); // Sửa: dùng Schedule thay vì Command
const { authenticate } = require('../middleware/auth');

// POST /api/schedule: Đặt lịch (với repeat, daysOfWeek)
router.post('/', authenticate, async (req, res) => {
  try {
    const { gatewayId, deviceId, brightness, startTime, endTime, action, daysOfWeek, repeat } = req.body; // Thêm các trường từ model

    if (!gatewayId || !deviceId || !brightness || !startTime || !endTime || !action) {
      return res.status(400).json({ ok: false, message: "Missing required fields" });
    }

    // Validate times (HH:mm:ss)
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$/;
    if (!timeRegex.test(startTime) || !timeRegex.test(endTime)) {
      return res.status(400).json({ ok: false, message: "Invalid time format (HH:mm:ss)" });
    }

    // Validate daysOfWeek if weekly
    if (repeat === 'weekly' && (!daysOfWeek || !Array.isArray(daysOfWeek) || daysOfWeek.length === 0)) {
      return res.status(400).json({ ok: false, message: "daysOfWeek required for weekly repeat" });
    }

    const schedule = new Schedule({
      gatewayId,
      deviceId,
      brightness,
      startTime,
      endTime,
      action,
      daysOfWeek: daysOfWeek || [],
      repeat: repeat || 'none'
    });

    await schedule.save();

    res.json({ ok: true, message: "Schedule set", schedule });
  } catch (err) {
    console.error("[SCHEDULE] error:", err);
    res.status(500).json({ ok: false, message: "Server error" });
  }
});

// GET /api/schedule: Lấy tất cả lịch
router.get('/', authenticate, async (req, res) => {
  try {
    const schedules = await Schedule.find().sort({ createdAt: -1 });
    res.json({ ok: true, schedules });
  } catch (err) {
    console.error("[SCHEDULE GET] error:", err);
    res.status(500).json({ ok: false, message: "Server error" });
  }
});

// DELETE /api/schedule/:id: Xóa lịch (thêm để hỗ trợ xóa từ frontend)
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    await Schedule.findByIdAndDelete(id);
    res.json({ ok: true, message: "Schedule deleted" });
  } catch (err) {
    console.error("[SCHEDULE DELETE] error:", err);
    res.status(500).json({ ok: false, message: "Server error" });
  }
});

module.exports = router;
