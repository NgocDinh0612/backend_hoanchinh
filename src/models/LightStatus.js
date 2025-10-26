const mongoose = require('mongoose');

const lightStatusSchema = new mongoose.Schema({
  deviceId: { type: String, required: true, index: true }, // index for fast lookup
  relay: { type: Boolean, default: false },   // trạng thái thực tế của relay
  desired: { type: Boolean, default: false }, // trạng thái mong muốn (ON/OFF)
  brightness: { type: Number, default: 50, min: 0, max: 100 }, // brightness %
  lux: { type: Number, default: null },       // BH1750 reading
  current: { type: Number, default: null },   // current consumption (A)
  rssi: { type: Number, default: null },      // signal (LoRa or WiFi) if available
  isOnline: { type: Boolean, default: true }, // optional: quick online flag
  lastSeen: { type: Date, default: Date.now },// last time gateway reported this node
  lastUpdated: { type: Date, default: Date.now }
}, { timestamps: true });

// collection = relay_data
module.exports = mongoose.model('LightStatus', lightStatusSchema, 'relay_data');
