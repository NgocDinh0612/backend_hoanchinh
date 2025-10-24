const mongoose = require('mongoose');

const GatewaySchema = new mongoose.Schema({
  gw_id: { type: String, required: true, unique: true, index: true },
  meta: { type: Object, default: {} },
  createdAt: { type: Date, default: Date.now },
  lastSeen: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Gateway', GatewaySchema);