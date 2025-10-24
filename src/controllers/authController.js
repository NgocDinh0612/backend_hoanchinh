// nơi xử lí đăng nhập, đăng kí, xác minh email
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
const User = require("../models/User");

exports.inviteUser = async (req, res) => {
  try {
    const { email } = req.body;

    // Kiểm tra xem user đã tồn tại chưa
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "Email đã được đăng ký." });
    }

    // Tạo token xác nhận
    const token = jwt.sign({ email }, process.env.EMAIL_SECRET, { expiresIn: "1h" });
    const verifyLink = `${process.env.FRONTEND_URL}/register?token=${token}`;

    // Gửi mail mời đăng ký
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    await transporter.sendMail({
      from: `"Smart Streetlight" <${process.env.SMTP_USER}>`,
      to: email,
      subject: "Mời bạn đăng ký tài khoản Smart Streetlight",
      html: `<p>Bạn được mời tạo tài khoản Smart Streetlight.</p>
             <p>Nhấn vào link sau để hoàn tất đăng ký:</p>
             <a href="${verifyLink}">${verifyLink}</a>`,
    });

    res.json({ message: "Đã gửi mail mời đăng ký." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Lỗi khi gửi email." });
  }
};
