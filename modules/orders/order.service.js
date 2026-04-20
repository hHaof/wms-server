const Product = require('../../models/product.model');
const Order = require('../../models/order.model');
const { STATUS, STATUS_TRANSITIONS } = require('../../models/order.model');

const MAX_LIMIT = 100;

const createError = (message, status) => {
  const err = new Error(message);
  err.status = status;
  return err;
};

const generateOrderNumber = () => {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const suffix = Math.floor(1000 + Math.random() * 9000);
  return `ORD-${dateStr}-${suffix}`;
};

// Deducts stock atomically at document level using conditional update.
// Rolls back all previously deducted items if any single item fails.
const deductStock = async (items) => {
  const deducted = [];

  for (const item of items) {
    const product = await Product.findOneAndUpdate(
      { _id: item.product, stock: { $gte: item.quantity }, isActive: true },
      { $inc: { stock: -item.quantity } },
      { new: true }
    );
    if (!product) {
      await restoreStock(deducted);
      throw createError(`Sản phẩm "${item.name}" không đủ tồn kho`, 400);
    }
    deducted.push({ product: item.product, quantity: item.quantity });
  }

  return deducted;
};

const restoreStock = async (items) => {
  await Promise.all(
    items.map((item) =>
      Product.findByIdAndUpdate(item.product, { $inc: { stock: item.quantity } })
    )
  );
};

const createOrder = async ({ customer, items, note }, userId) => {
  const productIds = items.map((i) => i.product);
  const products = await Product.find({ _id: { $in: productIds }, isActive: true });

  if (products.length !== productIds.length) {
    throw createError('Một hoặc nhiều sản phẩm không tồn tại hoặc đã bị vô hiệu hóa', 400);
  }

  const productMap = Object.fromEntries(products.map((p) => [p._id.toString(), p]));

  const orderItems = items.map((item) => {
    const product = productMap[item.product];
    return {
      product: product._id,
      sku: product.sku,
      name: product.name,
      price: product.price,
      quantity: item.quantity,
      subtotal: product.price * item.quantity,
    };
  });

  const totalAmount = orderItems.reduce((sum, i) => sum + i.subtotal, 0);

  await deductStock(orderItems);

  // Retry up to 3 times on orderNumber collision (birthday-problem risk with high volume)
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const order = await Order.create({
        orderNumber: generateOrderNumber(),
        customer,
        items: orderItems,
        totalAmount,
        note,
        createdBy: userId,
        statusHistory: [{ status: STATUS.PENDING, changedBy: userId }],
      });
      return order;
    } catch (err) {
      const isCollision = err.code === 11000 && err.keyPattern?.orderNumber;
      if (isCollision && attempt < 2) continue;
      // Non-collision error or last attempt — restore stock and rethrow
      await restoreStock(orderItems.map((i) => ({ product: i.product, quantity: i.quantity })));
      throw err;
    }
  }
};

const getOrders = async ({ page = 1, limit = 20, status, assignedPacker, search }) => {
  const filter = {};
  if (status) filter.status = status;
  if (assignedPacker) filter.assignedPacker = assignedPacker;
  if (search) {
    // Escape regex metacharacters to prevent ReDoS
    const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    filter.orderNumber = { $regex: escaped, $options: 'i' };
  }

  const safeLimit = Math.min(Math.max(1, Number(limit) || 20), MAX_LIMIT);
  const skip = (page - 1) * safeLimit;

  const [orders, total] = await Promise.all([
    Order.find(filter)
      .populate('createdBy', 'name')
      .populate('assignedPacker', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(safeLimit),
    Order.countDocuments(filter),
  ]);

  return {
    orders,
    pagination: { total, page: Number(page), limit: safeLimit, totalPages: Math.ceil(total / safeLimit) },
  };
};

const getOrderById = async (id) => {
  const order = await Order.findById(id)
    .populate('createdBy', 'name email')
    .populate('assignedPacker', 'name email')
    .populate('items.product', 'sku name unit');
  if (!order) throw createError('Không tìm thấy đơn hàng', 404);
  return order;
};

const updateStatus = async (id, newStatus, userId, note) => {
  const order = await Order.findById(id);
  if (!order) throw createError('Không tìm thấy đơn hàng', 404);

  const allowed = STATUS_TRANSITIONS[order.status];
  if (!allowed.includes(newStatus)) {
    throw createError(`Không thể chuyển từ "${order.status}" sang "${newStatus}"`, 400);
  }

  order.status = newStatus;
  order.statusHistory.push({ status: newStatus, changedBy: userId, note });
  await order.save();
  return order;
};

const getPackingQueue = async (packerId, role) => {
  const filter = { status: { $in: [STATUS.PENDING, STATUS.PACKED] } };

  if (role === 'packer') {
    filter.$or = [
      { assignedPacker: null, status: STATUS.PENDING },
      { assignedPacker: packerId },
    ];
  }

  return Order.find(filter)
    .populate('assignedPacker', 'name')
    .sort({ status: 1, createdAt: 1 });
};

const claimOrder = async (id, packerId) => {
  const order = await Order.findOneAndUpdate(
    { _id: id, status: STATUS.PENDING, assignedPacker: null },
    { assignedPacker: packerId },
    { new: true }
  );
  if (!order) throw createError('Đơn hàng không tồn tại, đã được nhận hoặc không ở trạng thái pending', 400);
  return order;
};

module.exports = { createOrder, getOrders, getOrderById, updateStatus, getPackingQueue, claimOrder };
