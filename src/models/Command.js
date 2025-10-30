    // const mongoose = require('mongoose');

    // const CommandSchema = new mongoose.Schema({
    // deviceId: { type: String, required: true, index: true },
    // command: { type: String, required: true }, // "ON" | "OFF" | "BRIGHTNESS" | ...
    // params: { type: Object, default: {} }, // ví dụ: { value: 70 }
    // status: { type: String, enum: ['pending', 'sent', 'done', 'failed'], default: 'pending' },
    // }, { timestamps: false }); // Vô hiệu hóa timestamps

    // module.exports = mongoose.model('Command', CommandSchema);

//thêm lệnh tạo lịch

const mongoose = require('mongoose');

const CommandSchema = new mongoose.Schema({
  deviceId: { type: String, required: true, index: true },
  command: { type: String, required: true }, // "ON" | "OFF" | "BRIGHTNESS" | ...
  params: { type: Object, default: {} }, // ví dụ: { value: 70 }
  status: { type: String, enum: ['pending', 'sent', 'done', 'failed'], default: 'pending' },
  scheduledAt: { type: Date, default: null }, // Thêm: thời gian dự kiến gửi (null = gửi ngay)
}, { timestamps: true }); // Giữ timestamps để có createdAt tự động

module.exports = mongoose.model('Command', CommandSchema);
