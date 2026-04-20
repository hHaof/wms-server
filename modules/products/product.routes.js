const { Router } = require('express');
const { body, param } = require('express-validator');
const productController = require('./product.controller');
const { verifyToken, requireRole } = require('../../middleware/auth');

const router = Router();

// All product routes require authentication
router.use(verifyToken);

const idRule = param('id').isMongoId().withMessage('ID không hợp lệ');

const createRules = [
  body('name').trim().notEmpty().withMessage('Tên không được để trống'),
  body('sku').trim().notEmpty().toUpperCase().withMessage('SKU không được để trống'),
  body('category').trim().notEmpty().withMessage('Danh mục không được để trống'),
  body('price').isFloat({ min: 0 }).withMessage('Giá phải là số không âm'),
  body('unit').optional().isIn(['piece', 'kg', 'box', 'liter', 'meter']).withMessage('Đơn vị không hợp lệ'),
  body('stock').optional().isInt({ min: 0 }).withMessage('Tồn kho phải là số không âm'),
  body('lowStockThreshold').optional().isInt({ min: 0 }),
  body('description').optional().trim(),
];

const updateRules = [
  idRule,
  body('name').optional().trim().notEmpty(),
  body('category').optional().trim().notEmpty(),
  body('price').optional().isFloat({ min: 0 }),
  body('unit').optional().isIn(['piece', 'kg', 'box', 'liter', 'meter']),
  body('isActive').optional().isBoolean(),
  body('description').optional().trim(),
];

const stockRules = [
  idRule,
  // adjustment: positive = restock, negative = dispatch
  body('adjustment')
    .isInt()
    .withMessage('adjustment phải là số nguyên')
    .not().equals('0').withMessage('adjustment không được bằng 0'),
];

router.get('/', productController.getProducts);
router.get('/:id', idRule, productController.getProduct);

// Only admin and warehouse roles can create/update products
router.post('/', requireRole('admin', 'warehouse'), ...createRules, productController.createProduct);
router.patch('/:id', requireRole('admin', 'warehouse'), ...updateRules, productController.updateProduct);
router.patch('/:id/stock', requireRole('admin', 'warehouse'), ...stockRules, productController.updateStock);

module.exports = router;
