// // routes/auth.js
// const express = require('express');
// const router = express.Router();
// const jwt = require('jsonwebtoken');
// const bcrypt = require('bcrypt');
// const passport = require('passport');
// const GoogleStrategy = require('passport-google-oauth20').Strategy;

// const User = require('../models/User');
// const ActivityLog = require("../models/ActivityLog");
// const { authenticate } = require('../middleware/auth');

// const JWT_SECRET = process.env.JWT_SECRET;
// const REFRESH_SECRET = process.env.REFRESH_SECRET;
// let refreshTokens = [];

// /* ----------------- Google OAuth ----------------- */
// passport.use(new GoogleStrategy({
//   clientID: process.env.GOOGLE_CLIENT_ID,
//   clientSecret: process.env.GOOGLE_CLIENT_SECRET,
//   // callbackURL: process.env.BACKEND_URL + "/auth/google/callback" // test Render
//   callbackURL: process.env.GOOGLE_CALLBACK_URL // test local
// }, async (accessToken, refreshToken, profile, done) => {
//   try {
//     // Tìm user theo Google ID
//     let user = await User.findOne({ googleId: profile.id });
//     if (!user) {
//       // Nếu chưa có thì tạo mới
//       user = new User({
//         username: profile.emails[0].value,
//         googleId: profile.id,
//         role: "user" // mặc định quyền thấp nhất
//       });
//       await user.save();
//     }
//     return done(null, user);
//   } catch (err) {
//     return done(err, null);
//   }
// }));

// // Gọi để redirect user sang Google
// router.get("/google", (req, res, next) => {
//   const role = req.query.role || "user";
//   req.session.role = role; // luu tam trong session
//   next();
// }, passport.authenticate("google", { scope: ["profile", "email"] }));

// // Callback từ Google
// router.get("/google/callback",
//   passport.authenticate("google", { failureRedirect: "/login"}),
//   async (req, res) => {
//     try {
//       const role = req.session.role ||"user";
//       const email = req.user.emails?.[0]?.value || "";
//       const name = req.user.displayName || "";
//       // tim user theo email
//       let user = await User.findOne({ email });

//       if (!user) {
//         user = await User.create({
//           username: email.split("@")[0],
//           email,
//           name,
//           password: "",
//           role,
//         });
//       }


//       // tao JWT token
//       const accessToken = jwt.sign(
//         { id: user._id, role: user.role },
//         process.env.JWT_SECRET,
//         { expiresIn: "1h"}
//       );

//       const refreshToken = jwt.sign(
//         { id: user._id },
//         process.env.REFRESH_SECRET,

//         { expiresIn: "7d"}
//       );


//       // tra token ve cho frontend

//       const redirectUrl = `${process.env.BASE_URL}/auth/success?accessToken=${accessToken}&refreshToken=${refreshToken}`;
//       res.redirect(redirectUrl);
//     } catch (err) {
//       console.error("Google callback error: ", err);
//       res.redirect("/login?error=google-auth-failed");
//     }
//   }
// );

// router.get("/success", (req, res) => {
//   res.send(`
//     <script>
//       window.opener.postMessage({
//         accessToken: "${req.query.accessToken}",
//         refreshToken: "${req.query.refreshToken}"
//       }, window.location.origin);
//       window.close();
//     </script>
//   `);
// });

// /* ----------------- Local Register/Login ----------------- */
// // Đăng ký
// router.post('/register', async (req, res) => {
//   const { username, password, role } = req.body;
//   try {
//     const hash = await bcrypt.hash(password, 10);
//     const user = new User({ username, password: hash, role });
//     await user.save();
//     res.json({ message: 'Đăng ký thành công' });
//   } catch (err) {
//     res.status(400).json({ message: 'Đăng ký thất bại', error: err.message });
//   }
// });

// // Đăng nhập
// router.post('/login', async (req, res) => {
//   const { username, password } = req.body;
//   const user = await User.findOne({ username });
//   if (!user) return res.status(401).json({ message: 'Sai tài khoản hoặc mật khẩu' });

//   const isMatch = await bcrypt.compare(password, user.password);
//   if (!isMatch) return res.status(401).json({ message: 'Sai tài khoản hoặc mật khẩu' });

//   // Ghi log
//   await ActivityLog.create({
//     userId: user._id,
//     username: user.username,
//     action: "Đăng nhập",
//     role: user.role,
//     ip: req.ip
//   });

//   const accessToken = jwt.sign(
//     { userId: user._id, role: user.role, username: user.username },
//     JWT_SECRET,
//     { expiresIn: '15m' }
//   );

//   const refreshToken = jwt.sign(
//     { userId: user._id },
//     REFRESH_SECRET,
//     { expiresIn: '7d' }
//   );
//   refreshTokens.push(refreshToken);

//   res.json({ accessToken, refreshToken });
// });

// /* ----------------- Refresh & Me ----------------- */
// // Refresh token
// router.post('/refresh', (req, res) => {
//   const { refreshToken } = req.body;
//   if (!refreshToken || !refreshTokens.includes(refreshToken)) {
//     return res.status(403).json({ message: "Refresh token không hợp lệ" });
//   }

//   jwt.verify(refreshToken, REFRESH_SECRET, (err, payload) => {
//     if (err) return res.status(403).json({ message: "Refresh token hết hạn" });

//     const accessToken = jwt.sign(
//       { userId: payload.userId },
//       JWT_SECRET,
//       { expiresIn: '15m' }
//     );

//     res.json({ accessToken });
//   });
// });

// // Lấy thông tin user hiện tại
// router.get('/me', authenticate, (req, res) => {
//   res.json({
//     userId: req.user.userId,
//     role: req.user.role,
//     username: req.user.username
//   });
// });

// // router cho email

// router.get('/verify-email',async (req, res) => {
//   const { token } =req.query;
//   try {
//     const user = await User.findOne({
//       verificationToken: token,
//       verificationExpires: { $gt: Date.now() }
//     });
//     if (!user) {
//       return res.status(400).json({ message: "Token không hợp lệ hoặc đã hết hạn"});

//     }
//     user.verified = true;
//     user.verificationToken =undefined;
//     user.verificationExpires = undefined;
//     await user.save();
//     res.json({ message: "Xác nhận email thành công. Bạn có thể đăng nhập bằng Google"});
//   } catch (err) {
//     console.error("GET /auth/verify-email error: ", err.message);
//     res.status(500).json({ message: "Lỗi server khi xác nhận email"})
//   }
// })

// module.exports = router;




const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const nodemailer = require("nodemailer");
const crypto = require("crypto");

const User = require("../models/User");
const ActivityLog = require("../models/ActivityLog");
const { authenticate } = require("../middleware/auth");

const JWT_SECRET = process.env.JWT_SECRET;
const REFRESH_SECRET = process.env.REFRESH_SECRET;
let refreshTokens = [];

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL, // test local
      // callbackURL: process.env.BACKEND_URL + "/auth/google/callback" // test Render
    },
    async (accessToken, refreshToken, profile, done) => {
      return done(null, profile); // không lưu DB ở đây
    }
  )
);

router.get(
  "/google",
  (req, res, next) => {
    req.session.role = req.query.role || "user";
    next();
  },
  passport.authenticate("google", { scope: ["profile", "email"] })
);

router.get(
  "/google/callback",
  passport.authenticate("google", { failureRedirect: "/login" }),
  async (req, res) => {
    try {
      const email = req.user.emails?.[0]?.value;
      const name = req.user.displayName;
      const role = req.session.role || "user";

      let user = await User.findOne({ email });

      // Nếu user đã xác minh → đăng nhập luôn
      if (user && user.isVerified) {
        const accessToken = jwt.sign(
          { id: user._id, role: user.role },
          JWT_SECRET,
          { expiresIn: "1h" }
        );
        const refreshToken = jwt.sign({ id: user._id }, REFRESH_SECRET, {
          expiresIn: "7d",
        });

        const redirectUrl = `${process.env.BASE_URL}/auth/success?accessToken=${accessToken}&refreshToken=${refreshToken}&email=${email}`;
        return res.redirect(redirectUrl);
      }

      // Nếu user chưa tồn tại hoặc chưa xác minh
      const crypto = require("crypto");
      const token = crypto.randomBytes(32).toString("hex");
      const expiry = Date.now() + 15 * 60 * 1000; // 15 phút

      if (!user) {
        user = new User({
          email,
          username: email.split("@")[0],
          role,
          isVerified: false,
          verificationToken: token,
          verificationExpiry: expiry,
        });
      } else {
        user.verificationToken = token;
        user.verificationExpiry = expiry;
        user.isVerified = false;
      }

      await user.save();

      // Gửi mail xác thực
      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: process.env.MAIL_USER,
          pass: process.env.MAIL_PASS,
        },
      });

      const verifyLink = `${process.env.SERVER_URL}/auth/verify-email?token=${token}`;

      await transporter.sendMail({
        from: `"Smart Streetlight" <${process.env.MAIL_USER}>`,
        to: email,
        subject: "Xác minh tài khoản Smart Streetlight",
        html: `
          <p>Chào ${name || "bạn"},</p>
          <p>Nhấn vào liên kết dưới đây để xác minh tài khoản Gmail của bạn:</p>
          <a href="${verifyLink}" target="_blank">${verifyLink}</a>
          <p>Liên kết này có hiệu lực trong 15 phút.</p>
        `,
      });

      return res.redirect(`${process.env.BASE_URL}/pending-verification`);
    } catch (err) {
      console.error("Google callback error:", err);
      res.redirect("/login?error=google-auth-failed");
    }
  }
);


router.get("/success", (req, res) => {
  res.send(`
    <script>
      window.opener.postMessage({
        accessToken: "${req.query.accessToken}",
        refreshToken: "${req.query.refreshToken}"
      }, window.location.origin);
      window.close();
    </script>
  `);
});

// Gửi email xác thực
router.post("/request-verification", async (req, res) => {
  const { email } = req.body;
  try {
    // Tạo token xác minh
    const token = crypto.randomBytes(32).toString("hex");
    const expiry = Date.now() + 15 * 60 * 1000; // 15 phút

    // Tạo mới hoặc cập nhật nếu email tồn tại
    let user = await User.findOne({ email });
    if (!user) {
      user = new User({ email, verificationToken: token, verificationExpiry: expiry });
    } else {
      user.verificationToken = token;
      user.verificationExpiry = expiry;
    }
    await user.save();

    // Gửi mail xác minh
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS,
      },
    });

    const verifyLink = `${process.env.SERVER_URL}/auth/verify-email?token=${token}`;

    await transporter.sendMail({
      from: `"Smart Streetlight" <${process.env.MAIL_USER}>`,
      to: email,
      subject: "Xác minh địa chỉ email của bạn",
      html: `
        <p>Chào bạn,</p>
        <p>Nhấn vào liên kết sau để xác minh email:</p>
        <a href="${verifyLink}" target="_blank">${verifyLink}</a>
        <p>Liên kết này sẽ hết hạn sau 15 phút.</p>
      `,
    });

    res.status(200).json({ message: "Đã gửi email xác minh thành công!" });
  } catch (err) {
    console.error("request-verification error:", err);
    res.status(500).json({ message: "Lỗi khi gửi email xác minh." });
  }
});
// Xác thực email
router.get("/verify-email", async (req, res) => {
  const { token } = req.query;
  try {
    const user = await User.findOne({
      verificationToken: token,
      verificationExpiry: { $gt: Date.now() },
    });

    if (!user) return res.status(400).send("Token không hợp lệ hoặc đã hết hạn.");

    user.isVerified = true;
    user.verificationToken = undefined;
    user.verificationExpiry = undefined;
    await user.save();

    // Gửi sang frontend trang hoàn tất đăng ký
    res.redirect(`${process.env.BASE_URL}/complete-registration?email=${user.email}`);
  } catch (err) {
    console.error("verify-email error:", err);
    res.status(500).send("Lỗi khi xác minh email.");
  }
});

// Hoàn tất đăng ký
router.post("/complete-registration", async (req, res) => {
  const { email, username, password, firstName, lastName, contact } = req.body;
  try {
    const user = await User.findOne({ email, isVerified: true });
    if (!user)
      return res.status(400).json({ message: "Email chưa được xác minh hoặc không tồn tại." });

    user.username = username;
    user.password = await bcrypt.hash(password, 10);
    user.firstName = firstName;
    user.lastName = lastName;
    user.contact = contact;
    await user.save();

    res.status(200).json({ message: "Đăng ký hoàn tất, bạn có thể đăng nhập ngay!" });
  } catch (err) {
    console.error("complete-registration error:", err);
    res.status(500).json({ message: "Lỗi khi hoàn tất đăng ký." });
  }
});

// Đăng nhập
router.post("/login", async (req, res) => {
  const { username, password } = req.body;
  const user = await User.findOne({ username });
  if (!user) return res.status(401).json({ message: "Sai tài khoản hoặc mật khẩu" });

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch)
    return res.status(401).json({ message: "Sai tài khoản hoặc mật khẩu" });

  await ActivityLog.create({
    userId: user._id,
    username: user.username,
    action: "Đăng nhập",
    role: user.role,
    ip: req.ip,
  });

  const accessToken = jwt.sign(
    { userId: user._id, role: user.role, username: user.username },
    JWT_SECRET,
    { expiresIn: "15m" }
  );

  const refreshToken = jwt.sign({ userId: user._id }, REFRESH_SECRET, {
    expiresIn: "7d",
  });
  refreshTokens.push(refreshToken);

  res.json({ accessToken, refreshToken });
});

router.post("/refresh", (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken || !refreshTokens.includes(refreshToken)) {
    return res.status(403).json({ message: "Refresh token không hợp lệ" });
  }

  jwt.verify(refreshToken, REFRESH_SECRET, (err, payload) => {
    if (err) return res.status(403).json({ message: "Refresh token hết hạn" });

    const accessToken = jwt.sign(
      { userId: payload.userId },
      JWT_SECRET,
      { expiresIn: "15m" }
    );

    res.json({ accessToken });
  });
});

router.get("/me", authenticate, (req, res) => {
  res.json({
    userId: req.user.userId,
    role: req.user.role,
    username: req.user.username,
  });
});

module.exports = router;
