// middleware/auth.js
const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET;

// Middleware xác thực JWT
function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ message: 'Thiếu token' });

  const token = authHeader.split(' ')[1];
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      console.error("JWT Verify error:", err.message);
      return res.status(403).json({ message: 'Token không hợp lệ' });
    }
    console.log("JWT decoded:", user);
    req.user = user;
    next();
  });
}

// Middleware phân quyền (role-based)
function authorize(roles = []) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Không đủ quyền truy cập' });
    }
    next();
  };
}

module.exports = { authenticate, authorize };
