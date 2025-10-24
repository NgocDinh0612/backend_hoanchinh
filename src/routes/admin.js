const express = require("express");
const bcrypt = require("bcrypt");
const router = express.Router();
const User = require("../models/User");
const { authenticate, authorize } = require("../middleware/auth");
const crypto = require("crypto");
const { sendVerificationEmail } = require("../utils/mailer");
const nodemailer = require("nodemailer"); 


router.post("/invite-user", authenticate, authorize(["admin"]), async (req, res) => {
  const { email, role } = req.body;
  if (!email || !role) return res.status(400).json({ message: "Thiếu email hoặc vai trò" });

  try {
    const existing = await User.findOne({ email });
    if (existing && existing.isVerified)
      return res.status(400).json({ message: "Email này đã được sử dụng" });

    const token = crypto.randomBytes(32).toString("hex");
    const user = existing || new User({ email, role });
    user.verificationToken = token;
    user.verificationExpiry = Date.now() + 3600 * 1000;
    user.isVerified = false;
    await user.save();

    const verifyLink = `${process.env.BASE_URL}/auth/verify-email?token=${token}`;
    await sendVerificationEmail(email, verifyLink); 

    res.json({ message: "Đã gửi lời mời qua email!" });
  } catch (err) {
    console.error("invite-user error:", err);
    res.status(500).json({ message: "Lỗi khi gửi lời mời" });
  }
});

router.get("/users", authenticate, authorize(["admin"]), async (req, res) => {
  try {
    const users = await User.find().select("-password");
    res.json(users);
  } catch (err) {
    console.error("[GET /admin/users] error:", err.message);
    res.status(500).json({ message: "Lỗi server khi lấy danh sách người dùng" });
  }
});

module.exports = router;