const { validationResult } = require('express-validator');
const orderService = require('./order.service');

const handleValidation = (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ message: 'Dữ liệu không hợp lệ', errors: errors.array() });
    return false;
  }
  return true;
};

const getOrders = async (req, res, next) => {
  try {
    const result = await orderService.getOrders(req.query);
    res.json(result);
  } catch (err) { next(err); }
};

const getOrder = async (req, res, next) => {
  try {
    const order = await orderService.getOrderById(req.params.id);
    res.json({ order });
  } catch (err) { next(err); }
};

const createOrder = async (req, res, next) => {
  try {
    if (!handleValidation(req, res)) return;
    const order = await orderService.createOrder(req.body, req.user.id);
    res.status(201).json({ message: 'Tạo đơn hàng thành công', order });
  } catch (err) { next(err); }
};

const updateStatus = async (req, res, next) => {
  try {
    if (!handleValidation(req, res)) return;
    const { status, note } = req.body;
    const order = await orderService.updateStatus(req.params.id, status, req.user.id, note);
    res.json({ message: 'Cập nhật trạng thái thành công', order });
  } catch (err) { next(err); }
};

// Packing page: queue of orders for packer to work through
const getPackingQueue = async (req, res, next) => {
  try {
    const orders = await orderService.getPackingQueue(req.user.id, req.user.role);
    res.json({ orders });
  } catch (err) { next(err); }
};

// Packer claims an unassigned order so others know it's being handled
const claimOrder = async (req, res, next) => {
  try {
    const order = await orderService.claimOrder(req.params.id, req.user.id);
    res.json({ message: 'Đã nhận đơn hàng', order });
  } catch (err) { next(err); }
};

module.exports = { getOrders, getOrder, createOrder, updateStatus, getPackingQueue, claimOrder };
