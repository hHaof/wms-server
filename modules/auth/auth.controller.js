const { validationResult } = require('express-validator');
const authService = require('./auth.service');
const { REFRESH_COOKIE_OPTIONS } = require('../../config/tokens');

const handleValidation = (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ message: 'Dữ liệu không hợp lệ', errors: errors.array() });
    return false;
  }
  return true;
};

const register = async (req, res, next) => {
  try {
    if (!handleValidation(req, res)) return;
    const { name, email, password, role } = req.body;
    const user = await authService.register({ name, email, password, role });
    res.status(201).json({ message: 'Tạo tài khoản thành công', user });
  } catch (err) { next(err); }
};

const login = async (req, res, next) => {
  try {
    if (!handleValidation(req, res)) return;
    const { email, password } = req.body;
    const { accessToken, refreshToken, user } = await authService.login({ email, password });
    res.cookie('refreshToken', refreshToken, REFRESH_COOKIE_OPTIONS);
    res.json({ message: 'Đăng nhập thành công', accessToken, user });
  } catch (err) { next(err); }
};

const refresh = async (req, res, next) => {
  try {
    const incomingToken = req.cookies?.refreshToken;
    const { accessToken, refreshToken, user } = await authService.refresh(incomingToken);
    res.cookie('refreshToken', refreshToken, REFRESH_COOKIE_OPTIONS);
    res.json({ accessToken, user });
  } catch (err) { next(err); }
};

const logout = async (req, res, next) => {
  try {
    if (req.user) await authService.logout(req.user.id);
    res.clearCookie('refreshToken', { path: '/api/auth' });
    res.json({ message: 'Đăng xuất thành công' });
  } catch (err) { next(err); }
};

const getMe = async (req, res, next) => {
  try {
    const user = await authService.getMe(req.user.id);
    res.json({ user });
  } catch (err) { next(err); }
};

module.exports = { register, login, refresh, logout, getMe };