// const express = require("express");
// const bcrypt = require("bcrypt");
// const router = express.Router();
// const User = require("../models/User");
// const { authenticate, authorize } = require("../middleware/auth");
// const crypto = require("crypto");
// const { sendVerificationEmail } = require("../utils/mailer");
// const nodemailer = require("nodemailer"); 


// router.post("/invite-user", authenticate, authorize(["admin"]), async (req, res) => {
//   const { email, role } = req.body;
//   if (!email || !role) return res.status(400).json({ message: "Thiếu email hoặc vai trò" });

//   try {
//     const existing = await User.findOne({ email });
//     if (existing && existing.isVerified)
//       return res.status(400).json({ message: "Email này đã được sử dụng" });

//     const token = crypto.randomBytes(32).toString("hex");
//     const user = existing || new User({ email, role });
//     user.verificationToken = token;
//     user.verificationExpiry = Date.now() + 3600 * 1000;
//     user.isVerified = false;
//     await user.save();

//     const verifyLink = `${process.env.BASE_URL}/auth/verify-email?token=${token}`;
//     await sendVerificationEmail(email, verifyLink); 

//     res.json({ message: "Đã gửi lời mời qua email!" });
//   } catch (err) {
//     console.error("invite-user error:", err);
//     res.status(500).json({ message: "Lỗi khi gửi lời mời" });
//   }
// });

// router.get("/users", authenticate, authorize(["admin"]), async (req, res) => {
//   try {
//     const users = await User.find().select("-password");
//     res.json(users);
//   } catch (err) {
//     console.error("[GET /admin/users] error:", err.message);



// routes/admin.js
const express = require("express");
const router = express.Router();
const User = require("../models/User");
const { authenticate, authorize } = require("../middleware/auth");
const crypto = require("crypto");
const { sendResendEmail } = require("../utils/resendMailer"); // ← MỚI

router.post("/invite-user", authenticate, authorize(["admin"]), async (req, res) => {
  const { email, role, firstName = "", lastName = "" } = req.body;
  if (!email || !role) return res.status(400).json({ message: "Thiếu email hoặc vai trò" });

  try {
    const existing = await User.findOne({ email });
    if (existing && existing.isVerified)
      return res.status(400).json({ message: "Email này đã được sử dụng" });

    const token = crypto.randomBytes(32).toString("hex");
    const expiry = Date.now() + 24 * 60 * 60 * 1000; // 24 giờ

    const user = existing || new User({ email, role });
    user.verificationToken = token;
    user.verificationExpiry = expiry;
    user.isVerified = false;
    user.firstName = firstName;
    user.lastName = lastName;
    await user.save();

    const verifyLink = `${process.env.BASE_URL}/auth/verify-email?token=${token}`;

    // DÙNG RESEND THAY GỬI MAIL
    await sendResendEmail({
      to: email,
      subject: "Mời bạn tham gia Smart Streetlight",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
          <h2 style="color: #10b981;">Chào ${firstName || "bạn"}!</h2>
          <p>Bạn được mời tham gia hệ thống <strong>Smart Streetlight</strong> với vai trò <strong>${role}</strong>.</p>
          <p>Nhấn nút dưới đây để xác minh tài khoản:</p>
          <a href="${verifyLink}" style="display: inline-block; background: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
            Xác minh ngay
          </a>
          <p style="margin-top: 20px; font-size: 0.9em; color: #666;">
            Liên kết hết hạn sau <strong>24 giờ</strong>.
          </p>
        </div>
      `,
    });

    res.json({ message: "Đã gửi lời mời qua email!" });
  } catch (err) {
    console.error("invite-user error:", err);
    res.status(500).json({ message: "Lỗi khi gửi lời mời" });
  }
});

// ... giữ nguyên /users route
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
//     res.status(500).json({ message: "Lỗi server khi lấy danh sách người dùng" });
//   }
// });

// module.exports = router;
