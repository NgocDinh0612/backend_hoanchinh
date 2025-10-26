const mongoose = require('mongoose');

const lightStatusSchema = new mongoose.Schema({
  deviceId: { type: String, required: true, index: true }, // index for fast lookup
  relay: { type: Boolean, default: false },   // trạng thái thực tế của relay (legacy, optional for nodes)
  desired: { type: Boolean, default: false }, // trạng thái mong muốn (ON/OFF) (legacy)
  brightness: { type: Number, default: 50, min: 0, max: 100 }, // brightness %
  lux: { type: Number, default: null },       // BH1750 reading
  current: { type: Number, default: null },   // current consumption (A)
  rssi: { type: Number, default: null },      // signal (LoRa or WiFi) if available
  isOnline: { type: Boolean, default: true }, // optional: quick online flag
  lastSeen: { type: Date, default: Date.now },// last time gateway reported this node
  lastUpdated: { type: Date, default: Date.now }
}, { timestamps: true });

// Thêm index cho query status gần nhất (tối ưu GET /devices)
lightStatusSchema.index({ deviceId: 1, lastUpdated: -1 });

// collection = relay_data (giữ nguyên, hoặc đổi thành 'light_status' nếu muốn)
module.exports = mongoose.model('LightStatus', lightStatusSchema, 'relay_data');
