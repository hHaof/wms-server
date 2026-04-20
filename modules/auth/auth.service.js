const bcrypt = require('bcryptjs');
const User = require('../../models/user.model');
const { signAccessToken, signRefreshToken, verifyRefreshToken } = require('../../config/tokens');

const register = async ({ name, email, password, role }) => {
  const existing = await User.findOne({ email });
  if (existing) {
    const err = new Error('Email đã được sử dụng');
    err.status = 409;
    throw err;
  }
  const user = await User.create({ name, email, passwordHash: password, role });
  return user;
};

const login = async ({ email, password }) => {
  const user = await User.findOne({ email, isActive: true }).select('+passwordHash');
  if (!user || !(await user.comparePassword(password))) {
    const err = new Error('Email hoặc mật khẩu không đúng');
    err.status = 401;
    throw err;
  }

  const payload = { sub: user._id, email: user.email, role: user.role };
  const accessToken = signAccessToken(payload);
  const refreshToken = signRefreshToken(payload);

  const salt = await bcrypt.genSalt(10);
  user.refreshTokenHash = await bcrypt.hash(refreshToken, salt);
  user.lastLoginAt = new Date();
  await user.save({ validateModifiedOnly: true });

  return { accessToken, refreshToken, user };
};

const refresh = async (incomingToken) => {
  if (!incomingToken) {
    const err = new Error('Không có refresh token');
    err.status = 401;
    throw err;
  }

  let decoded;
  try {
    decoded = verifyRefreshToken(incomingToken);
  } catch {
    const err = new Error('Refresh token không hợp lệ');
    err.status = 401;
    throw err;
  }

  const user = await User.findById(decoded.sub).select('+refreshTokenHash');
  if (!user || !user.refreshTokenHash) {
    const err = new Error('Phiên đăng nhập không tồn tại');
    err.status = 401;
    throw err;
  }

  const isValid = await user.compareRefreshToken(incomingToken);
  if (!isValid) {
    user.refreshTokenHash = undefined;
    await user.save({ validateModifiedOnly: true });
    const err = new Error('Token đã bị sử dụng. Vui lòng đăng nhập lại.');
    err.status = 401;
    throw err;
  }

  const payload = { sub: user._id, email: user.email, role: user.role };
  const newAccessToken = signAccessToken(payload);
  const newRefreshToken = signRefreshToken(payload);

  const salt = await bcrypt.genSalt(10);
  user.refreshTokenHash = await bcrypt.hash(newRefreshToken, salt);
  await user.save({ validateModifiedOnly: true });

  return { accessToken: newAccessToken, refreshToken: newRefreshToken, user };
};

const logout = async (userId) => {
  await User.findByIdAndUpdate(userId, { $unset: { refreshTokenHash: 1 } });
};

const getMe = async (userId) => {
  const user = await User.findById(userId);
  if (!user) {
    const err = new Error('Không tìm thấy người dùng');
    err.status = 404;
    throw err;
  }
  return user;
};

module.exports = { register, login, refresh, logout, getMe };