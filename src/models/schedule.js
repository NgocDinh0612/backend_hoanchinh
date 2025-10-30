// models/schedule.js
const mongoose = require('mongoose');

const scheduleSchema = new mongoose.Schema({
  gatewayId: { type: String }, // optional, để biết schedule thuộc gateway nào (nếu cần)
  deviceId: { type: String, required: true }, // target node (ví dụ ND_xxx)
  brightness: { type: Number, min: 0, max: 100, required: true },

  // time of day for schedule (HH:mm) — dùng cho cả repeat và single-day schedules that are recurring
  time: { type: String, required: true }, // "HH:mm"

  // optional start date for recurring schedules (ISO date string - day when schedule starts)
  startDate: { type: Date, default: null },
  endDate: { type: Date, default: null }, // optional stop date for recurring schedules

  // repeat rules
  repeat: { type: String, enum: ['none', 'daily', 'weekly', 'monthly', 'yearly'], default: 'none' },

  // weekly: [0..6] 0 = CN ... 6 = T7
  daysOfWeek: [{ type: Number }],

  // monthly/yearly
  dayOfMonth: { type: Number }, // 1..31
  month: { type: Number }, // 1..12 (for yearly)

  // track last run to avoid duplicate creation
  lastRun: { type: Date, default: null },

  active: { type: Boolean, default: true },

  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Schedule', scheduleSchema);
