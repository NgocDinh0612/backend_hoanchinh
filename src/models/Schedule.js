const mongoose = require('mongoose');

const scheduleSchema = new mongoose.Schema({
  gatewayId: { type: String, required: true },
  deviceId: { type: String, required: true },
  brightness: { type: Number, min: 0, max: 100, required: true },
  startTime: { type: String, required: true }, // "HH:mm:ss"
  endTime: { type: String, required: true },   // "HH:mm:ss"
  action: { type: String, enum: ['on', 'off'], required: true },
  daysOfWeek: [{ type: Number }],              // 0 = CN, ..., 6 = T7
  repeat: { type: String, enum: ['none', 'daily', 'weekly', 'monthly'], default: 'none' },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('schedule', scheduleSchema);
