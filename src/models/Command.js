    const mongoose = require('mongoose');

    const CommandSchema = new mongoose.Schema({
    deviceId: { type: String, required: true, index: true },
    command: { type: String, required: true }, // "ON" | "OFF" | "BRIGHTNESS" | ...
    params: { type: Object, default: {} }, // ví dụ: { value: 70 }
    status: { type: String, enum: ['pending', 'sent', 'done', 'failed'], default: 'pending' },
    }, { timestamps: false }); // Vô hiệu hóa timestamps

    module.exports = mongoose.model('Command', CommandSchema);