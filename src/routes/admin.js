const express = require("express");
const bcrypt = require("bcrypt");
const router = express.Router();
const User = require("../models/User");
const { authenticate, authorize } = require("../middleware/auth");
const crypto = require("crypto");

router.post("/create-user", authenticate, authorize(["admin"]), async (req, res) => {
  const { email, role } = req.body;

  if (!email || !role) {
    return res.status(400).json({ message: "Thiếu email hoặc role" });
  }

  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "Email đã tồn tại" });
    }

    const token = crypto.randomBytes(32).toString("hex");
    const newUser = new User({
      email,
      role,
      verified: false,
      verificationToken: token,
      verificationExpiry: Date.now() + 3600000, // 1h
    });
    await newUser.save();

    // gửi mail xác thực
    const transporter = require("nodemailer").createTransport({
      service: "Gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const verifyLink = `${process.env.BACKEND_URL}/auth/verify-email?token=${token}`;
    await transporter.sendMail({
      from: `"Smart StreetLight" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Xác nhận tài khoản",
      html: `
        <p>Xin chào,</p>
        <p>Bạn đã được admin mời tham gia hệ thống. Vui lòng xác nhận email bằng cách bấm vào link sau:</p>
        <a href="${verifyLink}">${verifyLink}</a>
        <p>Link sẽ hết hạn sau 1 giờ.</p>
      `,
    });

    res.status(201).json({ message: "Mời user thành công, vui lòng xác nhận email" });
  } catch (err) {
    console.error("[POST /admin/create-user] error:", err.message);
    res.status(500).json({ message: "Lỗi server khi tạo tài khoản" });
  }
});

router.get("/users", authenticate, authorize(["admin"]), async (req, res) => {
  try {
    const users = await User.find().select("-password"); // Ẩn password
    res.json(users);
  } catch (err) {
    console.error("[GET /admin/users] error:", err.message);
    res.status(500).json({ message: "Lỗi server khi lấy danh sách người dùng" });
  }
});

module.exports = router;