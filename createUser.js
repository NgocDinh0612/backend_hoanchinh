const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const User = require('./src/models/User');

require('dotenv').config();

async function createUser() {
  try {
    // Kết nối tới MongoDB
    await mongoose.connect(process.env.MONGO_URL, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Đã kết nối tới MongoDB');

    // Dữ liệu người dùng
    const userData = {
      firstName: process.env.FIRST_NAME || 'Admin123',
      lastName: process.env.LAST_NAME || 'User123',
      email: process.env.EMAIL || 'dinh@example.com',
      contact: process.env.CONTACT || '0948707845', // Số điện thoại hợp lệ (10 chữ số, bắt đầu bằng 0)
      address1: process.env.ADDRESS1 || 'Bình Định ',
      username: process.env.USERNAME || 'ngocdinh123',
      password: await bcrypt.hash(process.env.PASSWORD || '12345678', 10),
      role: process.env.ROLE || 'admin',
    };

    // Kiểm tra các trường bắt buộc
    const requiredFields = ['firstName', 'lastName', 'email', 'contact', 'address1', 'username', 'password', 'role'];
    for (const field of requiredFields) {
      if (!userData[field]) {
        throw new Error(`Thiếu trường bắt buộc: ${field}`);
      }
    }

    // Kiểm tra định dạng email
    if (!/^\S+@\S+\.\S+$/.test(userData.email)) {
      throw new Error('Email không hợp lệ');
    }

    // Kiểm tra định dạng số điện thoại
    if (!/^0[1-9][0-9]{8,9}$/.test(userData.contact)) {
      throw new Error('Số điện thoại không hợp lệ');
    }

    // Kiểm tra xem người dùng đã tồn tại chưa
    const existingUser = await User.findOne({
      $or: [{ username: userData.username }, { email: userData.email }, { contact: userData.contact }],
    });
    if (existingUser) {
      if (existingUser.username === userData.username) {
        throw new Error('Tên tài khoản đã tồn tại');
      }
      if (existingUser.email === userData.email) {
        throw new Error('Email đã tồn tại');
      }
      if (existingUser.contact === userData.contact) {
        throw new Error('Số điện thoại đã tồn tại');
      }
    }

    // Tạo người dùng mới
    const user = new User(userData);
    await user.save();
    console.log('Tạo người dùng admin thành công:', userData.username);
  } catch (err) {
    if (err.name === 'ValidationError') {
      console.error('Lỗi xác thực:');
      for (const field in err.errors) {
        console.error(`- ${field}: ${err.errors[field].message}`);
      }
    } else if (err.code === 11000) {
      console.error('Lỗi: Tên tài khoản, email hoặc số điện thoại đã tồn tại');
    } else {
      console.error('Lỗi khi tạo người dùng:', err.message);
    }
  } finally {
    // Đóng kết nối MongoDB
    await mongoose.connection.close();
    console.log('Đã ngắt kết nối MongoDB');
  }
}

createUser();