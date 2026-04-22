const { Router } = require('express');
const { body, param } = require('express-validator');
const productController = require('./product.controller');
const { verifyToken, requireRole } = require('../../middleware/auth');

const router = Router();

router.use(verifyToken);

const idRule = param('id').isMongoId().withMessage('Invalid ID');

const createRules = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('sku').trim().notEmpty().toUpperCase().withMessage('SKU is required'),
  body('category').trim().notEmpty().withMessage('Category is required'),
  body('price').isFloat({ min: 0 }).withMessage('Price must be a non-negative number'),
  body('unit').optional().isIn(['piece', 'kg', 'box', 'liter', 'meter']).withMessage('Invalid unit'),
  body('stock').optional().isInt({ min: 0 }).withMessage('Stock must be a non-negative integer'),
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
  body('adjustment')
    .isInt()
    .withMessage('adjustment must be an integer')
    .not().equals('0').withMessage('adjustment cannot be zero'),
];

router.get('/', productController.getProducts);
router.get('/:id', idRule, productController.getProduct);

router.post('/', requireRole('admin', 'warehouse'), ...createRules, productController.createProduct);
router.patch('/:id', requireRole('admin', 'warehouse'), ...updateRules, productController.updateProduct);
router.patch('/:id/stock', requireRole('admin', 'warehouse'), ...stockRules, productController.updateStock);
router.delete('/:id', requireRole('admin', 'warehouse'), idRule, productController.deleteProduct);

module.exports = router;
