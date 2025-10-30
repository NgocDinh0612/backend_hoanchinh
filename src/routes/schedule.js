// routes/schedule.js
const express = require('express');
const router = express.Router();
const Command = require('../models/Command');
const { authenticate } = require('../middleware/auth');

// POST /api/schedule: Đặt lịch (tạo Command với scheduledAt)
router.post('/', authenticate, async (req, res) => {
  try {
    const { deviceId, brightness, scheduledAt } = req.body; // scheduledAt = "2025-04-15T08:00:00"

    if (!deviceId || !brightness || !scheduledAt) {
      return res.status(400).json({ ok: false, message: "Missing required fields" });
    }

    const scheduleTime = new Date(scheduledAt);
    if (isNaN(scheduleTime.getTime()) || scheduleTime <= new Date()) {
      return res.status(400).json({ ok: false, message: "Scheduled time must be in the future" });
    }

    const cmd = new Command({
      deviceId,
      command: "BRIGHTNESS",
      params: { value: brightness },
      status: "pending",
      scheduledAt: scheduleTime
    });

    await cmd.save();

    res.json({ ok: true, message: "Schedule set", command: cmd });
  } catch (err) {
    console.error("[SCHEDULE] error:", err);
    res.status(500).json({ ok: false, message: "Server error" });
  }
});

// GET /api/schedule: Lấy tất cả lịch (để hiển thị)
router.get('/', authenticate, async (req, res) => {
  try {
    const schedules = await Command.find({ scheduledAt: { $ne: null } }).sort({ scheduledAt: 1 });
    res.json({ ok: true, schedules });
  } catch (err) {
    console.error("[SCHEDULE GET] error:", err);
    res.status(500).json({ ok: false, message: "Server error" });
  }
});

module.exports = router;
