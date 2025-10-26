const mongoose = require("mongoose");

const LightDeviceSchema = new mongoose.Schema({
  deviceId: { type: String, required: true, unique: true }, // MAC in uppercase expected

  type: { 
    type: String,
    enum: ["gateway", "node"], // rõ ràng hơn
    default: "node"
  },

  gatewayId: { type: String, default: null, index: true }, // null => là gateway

  gps: {
    lat: { type: Number, default: null },
    lon: { type: Number, default: null }
  },

  name: { type: String, required: true },
  location: { type: String, default: "" },
  
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: false },
  isDeleted: { type: Boolean, default: false },
  isAssigned: { type: Boolean, default: false },

  lastSeen: { type: Date, default: null }, // cập nhật khi report hoặc next-command (monitor online/offline)
}, { timestamps: true });

// Normalize deviceId to uppercase
LightDeviceSchema.pre('save', function(next) {
  if (this.deviceId) this.deviceId = String(this.deviceId).toUpperCase().trim();
  if (this.name) this.name = String(this.name).trim();
  // Optional: Force type for gateway (nếu deviceId là MAC format)
  if (this.gatewayId === null && this.type !== "gateway") {
    this.type = "gateway"; // Tự động set type nếu là gateway
  }
  next();
});

LightDeviceSchema.index(
  { name: 1, user: 1 },
  { unique: true, partialFilterExpression: { isDeleted: { $ne: true } } }
);

// Thêm index cho query nodes per gateway (tối ưu GET /devices và next-command)
LightDeviceSchema.index({ gatewayId: 1, type: 1 });

module.exports = mongoose.model("LightDevice", LightDeviceSchema);
