const mongoose = require('mongoose');

const lightStatusSchema = new mongoose.Schema({
  deviceId: { type: String, required: true, index: true },
  relay: { type: Boolean, default: false },
  desired: { type: Boolean, default: false },
  brightness: { type: Number, default: 50, min: 0, max: 100 },
  lux: { type: Number, default: null },
  current: { type: Number, default: null },
  rssi: { type: Number, default: null },
  isOnline: { type: Boolean, default: true },
  lastSeen: { type: Date, default: Date.now },
  lastUpdated: { type: Date, default: Date.now },
}, { timestamps: true });

// Query nhanh theo thiết bị
lightStatusSchema.index({ deviceId: 1, lastUpdated: -1 });

// TTL 30 ngày
lightStatusSchema.index(
  { createdAt: 1 },
  { expireAfterSeconds: 60 * 60 * 24 * 30 }
);

module.exports = mongoose.model('LightStatus', lightStatusSchema, 'relay_data');
