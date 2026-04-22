const { Router } = require('express');
const { body, param } = require('express-validator');
const orderController = require('./order.controller');
const { verifyToken, requireRole } = require('../../middleware/auth');

const router = Router();

router.use(verifyToken);

const idRule = param('id').isMongoId().withMessage('Invalid ID');

const createRules = [
  body('customer.name').trim().notEmpty().withMessage('Customer name is required'),
  body('customer.phone')
    .trim()
    .notEmpty()
    .withMessage('Phone number is required')
    .matches(/^[0-9+\-\s]{7,15}$/)
    .withMessage('Invalid phone number'),
  body('customer.address').trim().notEmpty().withMessage('Delivery address is required'),
  body('items').isArray({ min: 1 }).withMessage('Order must have at least 1 item'),
  body('items.*.product').isMongoId().withMessage('Invalid product ID'),
  body('items.*.quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
  body('note').optional().trim().isLength({ max: 500 }),
];

const statusRules = [
  idRule,
  body('status')
    .isIn(['packed', 'shipped'])
    .withMessage('Valid statuses: packed, shipped'),
  body('note').optional().trim().isLength({ max: 500 }),
];

router.get('/packing', requireRole('admin', 'warehouse', 'packer'), orderController.getPackingQueue);
router.patch('/:id/claim', idRule, requireRole('packer', 'warehouse', 'admin'), orderController.claimOrder);

router.get('/', orderController.getOrders);
router.get('/:id', idRule, orderController.getOrder);
router.post('/', requireRole('admin', 'warehouse'), ...createRules, orderController.createOrder);
router.patch('/:id/status', requireRole('admin', 'warehouse', 'packer'), ...statusRules, orderController.updateStatus);

module.exports = router;
