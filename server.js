// console.log('Server đang khởi động...');

// const express = require('express');
// const mongoose = require('mongoose');
// const cors = require('cors');
// const path = require('path'); 
// require('dotenv').config();

// //  Khởi tạo app TRƯỚC khi dùng app.use
// const app = express();

// // Middleware
// app.use(cors());
// app.use(express.json());
// app.use(express.static(path.join(__dirname, 'public')));

// // Routes
// const authRoutes = require('./src/routes/auth');
// app.use('/api/auth', authRoutes);

// app.use('/api/admin', require('./src/routes/admin'));
// app.use('/api/status', require('./src/routes/status'));
// app.use('/api/schedule', require('./src/routes/schedule'));

// // MongoDB
// mongoose.connect(process.env.MONGO_URL, { useNewUrlParser: true, useUnifiedTopology: true })
//   .then(() => console.log('Kết nối MongoDB thành công'))
//   .catch(err => console.error('Lỗi kết nối MongoDB:', err));

// // Trang chính
// app.get('/', (req, res) => {
//   res.sendFile(path.join(__dirname, 'public', 'index.html'));
// });

// app.get('/login.html', (req, res) => {
//   res.sendFile(path.join(__dirname, 'public', 'login.html'));
// });

// // Tự động điều khiển theo lịch
// const LightStatus = require('./src/models/LightStatus');
// const Schedule = require('./src/models/Schedule');

// setInterval(async () => {
//   const now = new Date();
//   const options = { hour: '2-digit', hour12: false, timeZone: 'Asia/Ho_Chi_Minh' };
//   const currentTime = now.toTimeString('vi-VN', options).substring(0, 5); // "HH:mm"
//   const dayOfWeek = now.getDay();

//   const schedules = await Schedule.find();
//   let action = null;

//   for (let sched of schedules) {
//     const matchDay = sched.daysOfWeek.length === 0 || sched.daysOfWeek.includes(dayOfWeek);
//     if (!matchDay) continue;

//     if (sched.startTime <= currentTime && currentTime <= sched.endTime) {
//       action = sched.action;
//       break;
//     }
//     if (currentTime > sched.endTime) {
//       action = sched.action === 'on' ? 'off' : 'on';
//     }
//   }

//   if (action !== null) {
//     const shouldBeOn = (action === 'on');
//     const latest = await LightStatus.findOne().sort({ updatedAt: -1 });
//     if (!latest || latest.isOn !== shouldBeOn) {
//       const newStatus = new LightStatus({ isOn: shouldBeOn });
//       await newStatus.save();
//       console.log(`[Schedule] Đèn ${shouldBeOn ? 'BẬT' : 'TẮT'} lúc ${currentTime}`);
//     } else {
//       console.log(`[Schedule] Giữ nguyên trạng thái: ${shouldBeOn ? 'BẬT' : 'TẮT'} lúc ${currentTime}`);
//     }
//   } else {
//     console.log(`[Schedule] Không có lịch phù hợp lúc ${currentTime}`);
//   }
// }, 10000);

// // Chạy server
// const PORT = process.env.PORT || 5000;
// app.listen(PORT, () => console.log(`Server đang chạy tại http://localhost:${PORT}`));


console.log('Server đang khởi động...');

const express = require('express');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cors = require('cors');
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config();
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const session = require('express-session');
const jwt = require('jsonwebtoken');

const User = require('./src/models/User'); // model user
const LightStatus = require('./src/models/LightStatus');
const Schedule = require('./src/models/Schedule');

const app = express();

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false, // tắt nếu frontend load script ngoài
}));
app.use(cors({
  origin: '*',
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json());

// Session cho passport (chỉ để passport hoạt động)
app.use(session({
  secret: process.env.JWT_SECRET || 'secret',
  resave: false,
  saveUninitialized: true,
}));
app.use(passport.initialize());
app.use(passport.session());

// Passport Google strategy
passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: process.env.GOOGLE_CALLBACK_URL
}, (accessToken, refreshToken, profile, done) => {
  return done(null, profile);
}));
passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((obj, done) => done(null, obj));

// Rate limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Quá nhiều request từ IP này, vui lòng thử lại sau 15 phút.'
});
app.use('/api', apiLimiter);

// Tạo HTTP server cho Socket.IO
const http = require('http').createServer(app);
const { Server } = require('socket.io');
const io = new Server(http);

const SECRET_KEY = process.env.JWT_SECRET;
const REFRESH_SECRET = process.env.REFRESH_SECRET;

// Middleware xác thực token trước khi kết nối WebSocket
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) return next(new Error('Authentication failed: No token'));

  try {
    const decoded = jwt.verify(token, SECRET_KEY);
    socket.user = decoded;
    next();
  } catch (err) {
    return next(new Error('Authentication failed: Invalid token'));
  }
});

app.use((req, res, next) => {
  req.io = io;
  next();
});

// MongoDB connect
mongoose.connect(process.env.MONGO_URL)
  .then(() => console.log('Kết nối MongoDB thành công'))
  .catch(err => console.error('Lỗi kết nối MongoDB:', err));

// ----------- Google OAuth API -----------

// Bước 1: Login bằng Google
app.get('/auth/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

// Bước 2: Callback sau khi Google xác thực
app.get('/auth/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: '/auth/google/failed' }),
  async (req, res) => {
    try {
      let user = await User.findOne({ email: req.user.emails[0].value });
      if (!user) {
        user = await User.create({
          email: req.user.emails[0].value,
          name: req.user.displayName,
          role: 'viewer'
        });
      }

      // Tạo token
      const accessToken = jwt.sign(
        { id: user._id, role: user.role },
        SECRET_KEY,
        { expiresIn: '15m' }
      );

      const refreshToken = jwt.sign(
        { id: user._id },
        REFRESH_SECRET,
        { expiresIn: '7d' }
      );

      res.json({
        ok: true,
        accessToken,
        refreshToken,
        user: {
          id: user._id,
          email: user.email,
          name: user.name,
          role: user.role
        }
      });
    } catch (err) {
      console.error("Google login error:", err);
      res.status(500).json({ ok: false, message: "Server error" });
    }
  }
);

app.get('/auth/google/failed', (req, res) => {
  res.status(401).json({ ok: false, message: 'Google login failed' });
});

// Refresh token API
app.post('/api/auth/refresh', async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) return res.status(401).json({ message: 'No refresh token provided' });

  try {
    const decoded = jwt.verify(refreshToken, REFRESH_SECRET);
    const user = await User.findById(decoded.id);
    if (!user) return res.status(401).json({ message: 'User not found' });

    const newAccessToken = jwt.sign(
      { id: user._id, role: user.role },
      SECRET_KEY,
      { expiresIn: '15m' }
    );

    res.json({ accessToken: newAccessToken });
  } catch (err) {
    return res.status(403).json({ message: 'Invalid refresh token' });
  }
});

// ----------- API Routes -----------
app.use('/api/auth', require('./src/routes/auth'));
app.use('/api/admin', require('./src/routes/admin'));
app.use('/api/status', require('./src/routes/status'));
app.use('/api/schedule', require('./src/routes/schedule'));
app.use('/api/devices', require('./src/routes/device'));
app.use('/api/gateway', require('./src/routes/gateway'));

// ----------- WebSocket -----------
io.on('connection', (socket) => {
  console.log('Client đã kết nối WebSocket');
});

// ----------- Auto schedule ----------- 
setInterval(async () => {
  const now = new Date();
  const options = { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Ho_Chi_Minh' };
  const currentTime = now.toLocaleTimeString('vi-VN', options).substring(0, 5);
  const dayOfWeek = now.getDay();

  const schedules = await Schedule.find();
  let action = null;

  for (let sched of schedules) {
    const matchDay = sched.daysOfWeek.length === 0 || sched.daysOfWeek.includes(dayOfWeek);
    if (!matchDay) continue;

    if (sched.startTime <= currentTime && currentTime <= sched.endTime) {
      action = sched.action;
      break;
    }
    if (currentTime > sched.endTime) {
      action = sched.action === 'on' ? 'off' : 'on';
    }
  }

  if (action !== null) {
    const shouldBeOn = (action === 'on');
    const latest = await LightStatus.findOne().sort({ updatedAt: -1 });

    if (!latest || latest.isOn !== shouldBeOn) {
      const newStatus = new LightStatus({ isOn: shouldBeOn });
      await newStatus.save();

      console.log(`[Schedule] Đèn ${shouldBeOn ? 'BẬT' : 'TẮT'} lúc ${currentTime}`);
      io.emit('lightStatusUpdated', shouldBeOn);
    }
  }
}, 10000);

// Start server
const PORT = process.env.PORT || 5000;
http.listen(PORT, "0.0.0.0", () => {
  console.log(`Server đang chạy tại http://0.0.0.0:${PORT}`);
});
