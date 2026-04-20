const { Router } = require('express');
const { body } = require('express-validator');
const rateLimit = require('express-rate-limit');
const authController = require('./auth.controller');
const { verifyToken } = require('../../middleware/auth');

const router = Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { message: 'Quá nhiều lần đăng nhập, thử lại sau 15 phút' },
  standardHeaders: true,
  legacyHeaders: false,
});

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: { message: 'Quá nhiều tài khoản đã được tạo, thử lại sau 1 giờ' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Separate limiter for refresh — without this the endpoint is brute-forceable
const refreshLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: { message: 'Quá nhiều request refresh, thử lại sau' },
  standardHeaders: true,
  legacyHeaders: false,
});

const registerRules = [
  body('name').trim().notEmpty().withMessage('Tên không được để trống').isLength({ max: 100 }),
  body('email').isEmail().withMessage('Email không hợp lệ').normalizeEmail(),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Mật khẩu tối thiểu 8 ký tự')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Mật khẩu cần có chữ hoa, chữ thường và số'),
  // 'admin' is intentionally excluded — admin accounts must be created by existing admins
  body('role').optional().isIn(['warehouse', 'packer']).withMessage('Role không hợp lệ'),
];

const loginRules = [
  body('email').isEmail().withMessage('Email không hợp lệ').normalizeEmail(),
  body('password').notEmpty().withMessage('Mật khẩu không được để trống'),
];

router.post('/register', registerLimiter, ...registerRules, authController.register);
router.post('/login', loginLimiter, ...loginRules, authController.login);
router.post('/refresh', refreshLimiter, authController.refresh);
router.post('/logout', verifyToken, authController.logout);
router.get('/me', verifyToken, authController.getMe);

module.exports = router;
