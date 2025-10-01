const express = require("express");
const bcrypt = require("bcrypt");
const router = express.Router();
const User = require("../models/User");
const { authenticate, authorize } = require("../middleware/auth");
const crypto = require("crypto");

router.post("/create-user", authenticate, authorize(["admin"]), async (req, res) => {
  const { firstName, lastName, email, contact, address1, username, password, role } = req.body;

  if (!firstName || !lastName || !email || !contact || !address1 || !username || !password || !role) {
    return res.status(400).json({ message: "Thiếu thông tin bắt buộc" });
  }

  try {
    // Kiểm tra email tồn tại chưa
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "Email đã tồn tại" });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Tạo token verify email
    const token = crypto.randomBytes(32).toString("hex");
    const newUser = new User({
      firstName,
      lastName,
      email,
      contact,
      address1,
      username,
      password: hashedPassword,
      role,
      verified: false,
      verificationToken: token,
      verificationExpiry: Date.now() + 3600000, // 1 hour
    });
    await newUser.save();

    // Gửi mail xác nhận
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
        <p>Xin chào ${firstName},</p>
        <p>Tài khoản của bạn được admin khởi tạo. Vui lòng xác nhận email bằng cách bấm vào link sau:</p>
        <a href="${verifyLink}">${verifyLink}</a>
        <p>Link sẽ hết hạn sau 1 giờ.</p>
      `,
    });

    res.status(201).json({ message: "Tạo tài khoản thành công", user: { username, role } });
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