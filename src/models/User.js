const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },

    email: { type: String, required: true, unique: true },
    contact: { type: String }, // SĐT (không bắt buộc)
    address1: { type: String }, // Địa chỉ (không bắt buộc)

    username: { type: String, unique: true, sparse: true }, 
    // sparse để cho phép user Google không cần username ngay từ đầu

    password: { type: String }, // Hash password (chỉ cho local login)

    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
    },

    // Xác thực email
    verified: { type: Boolean, default: false },
    verificationToken: { type: String },
    verificationExpiry: { type: Date },

    // OAuth
    googleId: { type: String }, // Lưu ID từ Google

  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);