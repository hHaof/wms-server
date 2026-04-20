const { Router } = require('express');
const { body, param } = require('express-validator');
const orderController = require('./order.controller');
const { verifyToken, requireRole } = require('../../middleware/auth');

const router = Router();

router.use(verifyToken);

const idRule = param('id').isMongoId().withMessage('ID không hợp lệ');

const createRules = [
  body('customer.name').trim().notEmpty().withMessage('Tên khách hàng không được để trống'),
  body('customer.phone')
    .trim()
    .notEmpty()
    .withMessage('Số điện thoại không được để trống')
    .matches(/^[0-9+\-\s]{7,15}$/)
    .withMessage('Số điện thoại không hợp lệ'),
  body('customer.address').trim().notEmpty().withMessage('Địa chỉ không được để trống'),
  body('items').isArray({ min: 1 }).withMessage('Đơn hàng cần ít nhất 1 sản phẩm'),
  body('items.*.product').isMongoId().withMessage('Product ID không hợp lệ'),
  body('items.*.quantity').isInt({ min: 1 }).withMessage('Số lượng phải ít nhất là 1'),
  body('note').optional().trim().isLength({ max: 500 }),
];

const statusRules = [
  idRule,
  body('status')
    .isIn(['packed', 'shipped'])
    .withMessage('Trạng thái hợp lệ: packed, shipped'),
  body('note').optional().trim().isLength({ max: 500 }),
];

// Packing queue — for packers and warehouse staff
router.get('/packing', requireRole('admin', 'warehouse', 'packer'), orderController.getPackingQueue);

// Claim an unassigned pending order (packer assigns themselves)
router.patch('/:id/claim', idRule, requireRole('packer', 'warehouse', 'admin'), orderController.claimOrder);

router.get('/', orderController.getOrders);
router.get('/:id', idRule, orderController.getOrder);
router.post('/', requireRole('admin', 'warehouse'), ...createRules, orderController.createOrder);
router.patch('/:id/status', requireRole('admin', 'warehouse', 'packer'), ...statusRules, orderController.updateStatus);

module.exports = router;
