// controller/authController.js
const jwt = require("jsonwebtoken");
const { sendResendEmail } = require("../utils/resendMailer"); // ← MỚI

exports.inviteUser = async (req, res) => {
  try {
    const { email } = req.body;
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "Email đã được đăng ký." });
    }

    const token = jwt.sign({ email }, process.env.EMAIL_SECRET, { expiresIn: "1h" });
    const verifyLink = `${process.env.FRONTEND_URL}/register?token=${token}`;

    await sendResendEmail({
      to: email,
      subject: "Mời bạn đăng ký tài khoản Smart Streetlight",
      html: `
        <p>Bạn được mời tạo tài khoản Smart Streetlight.</p>
        <p>Nhấn vào link sau để hoàn tất đăng ký:</p>
        <a href="${verifyLink}">${verifyLink}</a>
      `,
    });

    res.json({ message: "Đã gửi mail mời đăng ký." });
  } catch (err) {
    console.error("inviteUser error:", err);
    res.status(500).json({ message: "Lỗi khi gửi email." });
  }
};
