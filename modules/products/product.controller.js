const { validationResult } = require('express-validator');
const productService = require('./product.service');

const handleValidation = (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ message: 'Dữ liệu không hợp lệ', errors: errors.array() });
    return false;
  }
  return true;
};

const getProducts = async (req, res, next) => {
  try {
    const result = await productService.getProducts(req.query);
    res.json(result);
  } catch (err) { next(err); }
};

const getProduct = async (req, res, next) => {
  try {
    const product = await productService.getProductById(req.params.id);
    res.json({ product });
  } catch (err) { next(err); }
};

const createProduct = async (req, res, next) => {
  try {
    if (!handleValidation(req, res)) return;
    const product = await productService.createProduct(req.body, req.user.id);
    res.status(201).json({ message: 'Tạo sản phẩm thành công', product });
  } catch (err) { next(err); }
};

const updateProduct = async (req, res, next) => {
  try {
    if (!handleValidation(req, res)) return;
    const product = await productService.updateProduct(req.params.id, req.body);
    res.json({ message: 'Cập nhật thành công', product });
  } catch (err) { next(err); }
};

const updateStock = async (req, res, next) => {
  try {
    if (!handleValidation(req, res)) return;
    const { adjustment } = req.body;
    const product = await productService.updateStock(req.params.id, adjustment);
    res.json({ message: 'Cập nhật tồn kho thành công', product });
  } catch (err) { next(err); }
};

const deleteProduct = async (req, res, next) => {
  try {
    if (!handleValidation(req, res)) return;
    await productService.deleteProduct(req.params.id);
    res.json({ message: 'Đã xóa sản phẩm' });
  } catch (err) { next(err); }
};

module.exports = { getProducts, getProduct, createProduct, updateProduct, updateStock, deleteProduct };
