// routes/auth.js
const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;

const User = require('../models/User');
const ActivityLog = require("../models/ActivityLog");
const { authenticate } = require('../middleware/auth');

const JWT_SECRET = process.env.JWT_SECRET;
const REFRESH_SECRET = process.env.REFRESH_SECRET;
let refreshTokens = [];

/* ----------------- Google OAuth ----------------- */
passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  // callbackURL: process.env.BACKEND_URL + "/auth/google/callback" // test Render
  callbackURL: process.env.GOOGLE_CALLBACK_URL // test local
}, async (accessToken, refreshToken, profile, done) => {
  try {
    // Tìm user theo Google ID
    let user = await User.findOne({ googleId: profile.id });
    if (!user) {
      // Nếu chưa có thì tạo mới
      user = new User({
        username: profile.emails[0].value,
        googleId: profile.id,
        role: "viewer" // mặc định quyền thấp nhất
      });
      await user.save();
    }
    return done(null, user);
  } catch (err) {
    return done(err, null);
  }
}));

// Gọi để redirect user sang Google
router.get('/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

// Callback từ Google, thay vì redirect → trả JSON
router.get('/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: '/login-failed' }),
  async (req, res) => {
    try {
      const user = req.user;

      // Ghi log đăng nhập
      await ActivityLog.create({
        userId: user._id,
        username: user.username,
        action: "Đăng nhập Google",
        role: user.role,
        ip: req.ip
      });

      const accessToken = jwt.sign(
        { userId: user._id, role: user.role, username: user.username },
        JWT_SECRET,
        { expiresIn: '15m' }
      );

      const refreshToken = jwt.sign(
        { userId: user._id },
        REFRESH_SECRET,
        { expiresIn: '7d' }
      );

      refreshTokens.push(refreshToken);

      // Trả về JSON thay vì redirect
      res.json({ accessToken, refreshToken, user });
    } catch (err) {
      res.status(500).json({ message: "Google login error", error: err.message });
    }
  }
);

/* ----------------- Local Register/Login ----------------- */
// Đăng ký
router.post('/register', async (req, res) => {
  const { username, password, role } = req.body;
  try {
    const hash = await bcrypt.hash(password, 10);
    const user = new User({ username, password: hash, role });
    await user.save();
    res.json({ message: 'Đăng ký thành công' });
  } catch (err) {
    res.status(400).json({ message: 'Đăng ký thất bại', error: err.message });
  }
});

// Đăng nhập
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const user = await User.findOne({ username });
  if (!user) return res.status(401).json({ message: 'Sai tài khoản hoặc mật khẩu' });

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) return res.status(401).json({ message: 'Sai tài khoản hoặc mật khẩu' });

  // Ghi log
  await ActivityLog.create({
    userId: user._id,
    username: user.username,
    action: "Đăng nhập",
    role: user.role,
    ip: req.ip
  });

  const accessToken = jwt.sign(
    { userId: user._id, role: user.role, username: user.username },
    JWT_SECRET,
    { expiresIn: '15m' }
  );

  const refreshToken = jwt.sign(
    { userId: user._id },
    REFRESH_SECRET,
    { expiresIn: '7d' }
  );
  refreshTokens.push(refreshToken);

  res.json({ accessToken, refreshToken });
});

/* ----------------- Refresh & Me ----------------- */
// Refresh token
router.post('/refresh', (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken || !refreshTokens.includes(refreshToken)) {
    return res.status(403).json({ message: "Refresh token không hợp lệ" });
  }

  jwt.verify(refreshToken, REFRESH_SECRET, (err, payload) => {
    if (err) return res.status(403).json({ message: "Refresh token hết hạn" });

    const accessToken = jwt.sign(
      { userId: payload.userId },
      JWT_SECRET,
      { expiresIn: '15m' }
    );

    res.json({ accessToken });
  });
});

// Lấy thông tin user hiện tại
router.get('/me', authenticate, (req, res) => {
  res.json({
    userId: req.user.userId,
    role: req.user.role,
    username: req.user.username
  });
});

// router cho email

router.get('/verify-email',async (req, res) => {
  const { token } =req.query;
  try {
    const user = await User.findOne({
      verificationToken: token,
      verificationExpires: { $gt: Date.now() }
    });
    if ( User ) {
      return res.status(400).json({ message: "Token không hợp lệ hoặc đã hết hạn"});

    }
    user.verified = true;
    user.verificationToken =undefined;
    user.verficationExpires = undefined;
    await user.save();
    res.json({ message: "Xác nhận email thành công. Bạn có thể đăng nhập bằng Google"});
  } catch (err) {
    console.error("GET /auth/vertify-email error: ", err.message);
    res.status(500).json({ message: "Lỗi server khi xác nhận email"})
  }
})

module.exports = router;
