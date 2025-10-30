
// console.log('Server đang khởi động...');

// const express = require('express');
// const helmet = require('helmet');
// const rateLimit = require('express-rate-limit');
// const cors = require('cors');
// const mongoose = require('mongoose');
// const path = require('path');
// require('dotenv').config();
// const passport = require('passport');
// const GoogleStrategy = require('passport-google-oauth20').Strategy;
// const session = require('express-session');
// const jwt = require('jsonwebtoken');

// const User = require('./src/models/User'); // model user
// const LightStatus = require('./src/models/LightStatus');
// const Schedule = require('./src/models/Schedule');

// const app = express();
// app.set('trust proxy', 1); 
// // Security middleware
// app.use(helmet({
//   contentSecurityPolicy: false, // tắt nếu frontend load script ngoài
// }));
// app.use(cors({
//   origin: '*',
//   allowedHeaders: ['Content-Type', 'Authorization'],
// }));
// app.use(express.json());

// // Session cho passport (chỉ để passport hoạt động)
// app.use(session({
//   secret: process.env.JWT_SECRET || 'secret',
//   resave: false,
//   saveUninitialized: true,
// }));
// app.use(passport.initialize());
// app.use(passport.session());

// // Passport Google strategy
// passport.use(new GoogleStrategy({
//   clientID: process.env.GOOGLE_CLIENT_ID,
//   clientSecret: process.env.GOOGLE_CLIENT_SECRET,
//   callbackURL: process.env.GOOGLE_CALLBACK_URL
// }, (accessToken, refreshToken, profile, done) => {
//   return done(null, profile);
// }));
// passport.serializeUser((user, done) => done(null, user));
// passport.deserializeUser((obj, done) => done(null, obj));

// // Rate limiting
// const apiLimiter = rateLimit({
//   windowMs: 15 * 60 * 1000,
//   max: 100,
//   message: 'Quá nhiều request từ IP này, vui lòng thử lại sau 15 phút.'
// });
// app.use('/api', apiLimiter);

// // Tạo HTTP server cho Socket.IO
// const http = require('http').createServer(app);
// const { Server } = require('socket.io');
// const io = new Server(http);

// const SECRET_KEY = process.env.JWT_SECRET;
// const REFRESH_SECRET = process.env.REFRESH_SECRET;

// // Middleware xác thực token trước khi kết nối WebSocket
// io.use((socket, next) => {
//   const token = socket.handshake.auth.token;
//   if (!token) return next(new Error('Authentication failed: No token'));

//   try {
//     const decoded = jwt.verify(token, SECRET_KEY);
//     socket.user = decoded;
//     next();
//   } catch (err) {
//     return next(new Error('Authentication failed: Invalid token'));
//   }
// });

// app.use((req, res, next) => {
//   req.io = io;
//   next();
// });

// // MongoDB connect
// mongoose.connect(process.env.MONGO_URL)
//   .then(() => console.log('Kết nối MongoDB thành công'))
//   .catch(err => console.error('Lỗi kết nối MongoDB:', err));

// // ----------- Google OAuth API -----------

// // Bước 1: Login bằng Google
// app.get('/auth/google',
//   passport.authenticate('google', { scope: ['profile', 'email'] })
// );

// // Bước 2: Callback sau khi Google xác thực
// app.get('/auth/google/callback',
//   passport.authenticate('google', { session: false, failureRedirect: '/auth/google/failed' }),
//   async (req, res) => {
//     try {
//       let user = await User.findOne({ email: req.user.emails[0].value });
//       if (!user) {
//         user = await User.create({
//           email: req.user.emails[0].value,
//           name: req.user.displayName,
//           role: 'viewer'
//         });
//       }

//       // Tạo token
//       const accessToken = jwt.sign(
//         { id: user._id, role: user.role },
//         SECRET_KEY,
//         { expiresIn: '15m' }
//       );

//       const refreshToken = jwt.sign(
//         { id: user._id },
//         REFRESH_SECRET,
//         { expiresIn: '7d' }
//       );

//       res.json({
//         ok: true,
//         accessToken,
//         refreshToken,
//         user: {
//           id: user._id,
//           email: user.email,
//           name: user.name,
//           role: user.role
//         }
//       });
//     } catch (err) {
//       console.error("Google login error:", err);
//       res.status(500).json({ ok: false, message: "Server error" });
//     }
//   }
// );

// app.get('/auth/google/failed', (req, res) => {
//   res.status(401).json({ ok: false, message: 'Google login failed' });
// });

// // Refresh token API
// app.post('/api/auth/refresh', async (req, res) => {
//   const { refreshToken } = req.body;
//   if (!refreshToken) return res.status(401).json({ message: 'No refresh token provided' });

//   try {
//     const decoded = jwt.verify(refreshToken, REFRESH_SECRET);
//     const user = await User.findById(decoded.id);
//     if (!user) return res.status(401).json({ message: 'User not found' });

//     const newAccessToken = jwt.sign(
//       { id: user._id, role: user.role },
//       SECRET_KEY,
//       { expiresIn: '15m' }
//     );

//     res.json({ accessToken: newAccessToken });
//   } catch (err) {
//     return res.status(403).json({ message: 'Invalid refresh token' });
//   }
// });

// // ----------- API Routes -----------
// app.use('/api/auth', require('./src/routes/auth'));
// app.use('/api/admin', require('./src/routes/admin'));
// app.use('/api/status', require('./src/routes/status'));
// app.use('/api/schedule', require('./src/routes/schedule'));
// app.use('/api/devices', require('./src/routes/device'));
// app.use('/api/gateway', require('./src/routes/gateway'));

// // ----------- WebSocket -----------
// io.on('connection', (socket) => {
//   console.log('Client đã kết nối WebSocket');
// });

// // ----------- Auto schedule ----------- 
// setInterval(async () => {
//   const now = new Date();
//   const options = { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Ho_Chi_Minh' };
//   const currentTime = now.toLocaleTimeString('vi-VN', options).substring(0, 5);
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
//       io.emit('lightStatusUpdated', shouldBeOn);
//     }
//   }
// }, 10000);

// // Start server
// const PORT = process.env.PORT || 5000;
// http.listen(PORT, "0.0.0.0", () => {
//   console.log(`Server đang chạy tại http://0.0.0.0:${PORT}`);
// });




console.log('Server đang khởi động...');

const express = require('express');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cors = require('cors');
const mongoose = require('mongoose');
require('dotenv').config();
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const session = require('express-session');
const jwt = require('jsonwebtoken');
const http = require('http');

const app = express();
app.set('trust proxy', 1);

// --- Validate required envs (warning, don't exit automatically) ---
const requiredEnvs = ['MONGO_URL', 'JWT_SECRET', 'REFRESH_SECRET'];
const missingEnv = requiredEnvs.filter(k => !process.env[k]);
if (missingEnv.length) {
  console.warn('Warning: missing env vars:', missingEnv.join(', '));
  // Nếu muốn dừng server khi thiếu env: process.exit(1);
}

const SECRET_KEY = process.env.JWT_SECRET || 'secret';
const REFRESH_SECRET = process.env.REFRESH_SECRET || 'refresh_secret';

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false, // tắt nếu frontend load script ngoài
}));

// CORS: nếu bạn dùng cookie/credentials đổi origin và credentials: true
app.use(cors({
  origin: '*',
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json());

// Session cho passport (nếu dùng)
// Nếu bạn không dùng session-based auth, có thể loại bỏ express-session và passport.session()
app.use(session({
  secret: process.env.SESSION_SECRET || 'keyboard cat',
  resave: false,
  saveUninitialized: true,
}));

app.use(passport.initialize());
app.use(passport.session());

// Passport Google strategy (nếu dùng)
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET && process.env.GOOGLE_CALLBACK_URL) {
  passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_CALLBACK_URL
  }, (accessToken, refreshToken, profile, done) => {
    return done(null, profile);
  }));

  passport.serializeUser((user, done) => done(null, user));
  passport.deserializeUser((obj, done) => done(null, obj));
} else {
  // nếu không đủ env, skip đăng ký strategy
  console.warn('Google OAuth env missing - skipping passport GoogleStrategy registration');
}

// Rate limiting cho API
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Quá nhiều request từ IP này, vui lòng thử lại sau 15 phút.'
});
app.use('/api', apiLimiter);

// Create HTTP server + Socket.IO
const server = http.createServer(app);
const { Server } = require('socket.io');
const io = new Server(server, {
  // Cấu hình CORS cho socket nếu cần:
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Attach io vào req để route sử dụng (opsional)
app.use((req, res, next) => {
  req.io = io;
  next();
});

// MongoDB connect
mongoose.connect(process.env.MONGO_URL, {
  // useNewUrlParser: true, useUnifiedTopology: true // mongoose v6+ không cần
})
  .then(() => console.log('Kết nối MongoDB thành công'))
  .catch(err => console.error('Lỗi kết nối MongoDB:', err));

// Import models (đường dẫn theo cấu trúc dự án của bạn)
const User = require('./src/models/User'); // model user
const LightStatus = require('./src/models/LightStatus');
const Schedule = require('./src/models/schedule');

// ----------- WebSocket authentication (JWT) -----------
io.use((socket, next) => {
  try {
    const token = socket.handshake.auth && socket.handshake.auth.token;
    if (!token) {
      console.warn('WS auth failed: no token provided');
      return next(new Error('Authentication failed: No token'));
    }
    try {
      const decoded = jwt.verify(token, SECRET_KEY);
      socket.user = decoded;
      return next();
    } catch (err) {
      console.warn('WS auth failed: token invalid', err.message);
      return next(new Error('Authentication failed: Invalid token'));
    }
  } catch (err) {
    console.error('WS auth unexpected error:', err);
    return next(new Error('Authentication failed'));
  }
});

io.on('connection', (socket) => {
  console.log(`Client đã kết nối WebSocket (sid=${socket.id}, user=${socket.user ? socket.user.id : 'anon'})`);
  socket.on('disconnect', (reason) => {
    console.log(`Socket disconnected (sid=${socket.id}) reason=${reason}`);
  });
});

// ----------- Routes registration -----------
app.use('/api/auth', require('./src/routes/auth'));
app.use('/api/admin', require('./src/routes/admin'));
app.use('/api/status', require('./src/routes/status'));
app.use('/api/schedule', require('./src/routes/schedule'));
app.use('/api/devices', require('./src/routes/device'));
app.use('/api/gateway', require('./src/routes/gateway'));
app.use('/api/history', require('./src/routes/history'));
// Health check
app.get('/health', (req, res) => {
  res.json({ ok: true, uptime: process.uptime(), env: process.env.NODE_ENV || 'development' });
});

// ----------- Auto schedule (stable, không tạo doc không hợp lệ) -----------
const SCHEDULE_CHECK_INTERVAL_MS = 10 * 1000; // 10s

setInterval(async () => {
  try {
    const now = new Date();
    const options = { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Ho_Chi_Minh' };
    const currentTime = now.toLocaleTimeString('vi-VN', options).substring(0, 5); // "HH:MM"
    const dayOfWeek = now.getDay();

    const schedules = await Schedule.find();
    if (!schedules || schedules.length === 0) return;

    let action = null;
    for (let sched of schedules) {
      const matchDay = !Array.isArray(sched.daysOfWeek) || sched.daysOfWeek.length === 0 || sched.daysOfWeek.includes(dayOfWeek);
      if (!matchDay) continue;

      // assuming sched.startTime and sched.endTime are strings "HH:MM"
      if (sched.startTime <= currentTime && currentTime <= sched.endTime) {
        action = sched.action; // 'on' or 'off'
        break;
      }
      if (currentTime > sched.endTime) {
        action = (sched.action === 'on') ? 'off' : 'on';
      }
    }

    if (action === null) return;

    const shouldBeOn = (action === 'on');

    // IMPORTANT: update 'desired' field (or choose field phù hợp trên model LightStatus)
    // Nếu bạn muốn target cụ thể, thay {} bằng filter { deviceId: { $in: [...] } }
    const update = { desired: shouldBeOn, lastUpdated: new Date() };
    const resUpdate = await LightStatus.updateMany({}, { $set: update });

    // Emit event to clients with details
    io.emit('lightStatusUpdated', {
      desired: shouldBeOn,
      at: new Date().toISOString(),
      affected: (resUpdate.modifiedCount ?? resUpdate.nModified ?? 0)
    });

    console.log(`[Schedule] Applied action="${action}" => desired=${shouldBeOn} at ${currentTime}; modified=${resUpdate.modifiedCount ?? resUpdate.nModified ?? 0}`);
  } catch (err) {
    console.error("[Schedule] error:", err && err.stack ? err.stack : err);
  }
}, SCHEDULE_CHECK_INTERVAL_MS);

// ----------- Static files (nếu deploy cùng frontend build) -----------
const path = require('path');
if (process.env.SERVE_STATIC === 'true') {
  const clientBuildPath = path.join(__dirname, 'client', 'build');
  app.use(express.static(clientBuildPath));
  app.get('*', (req, res) => res.sendFile(path.join(clientBuildPath, 'index.html')));
}

// ----------- Global error handlers (process level) -----------
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err && err.stack ? err.stack : err);
  // tuỳ chọn: process.exit(1);
});

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, "0.0.0.0", () => {
  console.log(`Server đang chạy tại http://0.0.0.0:${PORT}`);
});
