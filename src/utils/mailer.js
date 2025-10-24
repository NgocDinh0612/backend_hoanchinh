const nodemailer = require("nodemailer");

async function sendVerificationEmail(to, link) {
  const transporter = nodemailer.createTransport({
    service: "Gmail",
    auth: {
      user: process.env.MAIL_USER,
      pass: process.env.MAIL_PASS,
    },
  });

  await transporter.sendMail({
    from: `"Smart Streetlight" <${process.env.MAIL_USER}>`,
    to,
    subject: "Xác nhận tài khoản Smart Streetlight",
    html: `
      <h2>Chào bạn,</h2>
      <p>Bạn được mời tham gia hệ thống Smart Streetlight.</p>
      <p>Nhấn vào liên kết bên dưới để xác nhận email và hoàn tất đăng ký:</p>
      <a href="${link}" target="_blank">${link}</a>
      <br/><br/>
      <p>Nếu bạn không yêu cầu điều này, vui lòng bỏ qua email.</p>
    `,
  });
}

module.exports = { sendVerificationEmail };
