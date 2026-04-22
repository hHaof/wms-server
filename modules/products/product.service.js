const Product = require('../../models/product.model');

const createError = (message, status) => {
  const err = new Error(message);
  err.status = status;
  return err;
};

const MAX_LIMIT = 100;

const getProducts = async ({ page = 1, limit = 20, category, search, isActive, stockStatus }) => {
  const filter = {};

  if (isActive !== undefined) filter.isActive = isActive === 'true';
  if (category) filter.category = category;
  if (search) filter.$text = { $search: search };
  if (stockStatus === 'low') filter.$expr = { $and: [{ $gt: ['$stock', 0] }, { $lte: ['$stock', '$lowStockThreshold'] }] };
  if (stockStatus === 'out') filter.stock = 0;

  const safeLimit = Math.min(Math.max(1, Number(limit) || 20), MAX_LIMIT);
  const skip = (page - 1) * safeLimit;

  const [products, total] = await Promise.all([
    Product.find(filter)
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(safeLimit),
    Product.countDocuments(filter),
  ]);

  return {
    products,
    pagination: {
      total,
      page: Number(page),
      limit: safeLimit,
      totalPages: Math.ceil(total / safeLimit),
    },
  };
};

const getProductById = async (id) => {
  const product = await Product.findById(id).populate('createdBy', 'name email');
  if (!product) throw createError('Product not found', 404);
  return product;
};

const createProduct = async (data, userId) => {
  const product = await Product.create({ ...data, createdBy: userId });
  return product;
};

const updateProduct = async (id, data) => {
  delete data.stock;

  const product = await Product.findByIdAndUpdate(id, data, {
    new: true,
    runValidators: true,
  });
  if (!product) throw createError('Product not found', 404);
  return product;
};

// Uses conditional atomic update to prevent race conditions under concurrent requests.
// A plain find-then-save pattern would allow two simultaneous exports to both
// read the same stock value, both pass the check, and both write — corrupting stock.
const updateStock = async (id, adjustment) => {
  if (adjustment > 0) {
    const product = await Product.findByIdAndUpdate(
      id,
      { $inc: { stock: adjustment } },
      { new: true, runValidators: true }
    );
    if (!product) throw createError('Product not found', 404);
    return product;
  }

  const product = await Product.findOneAndUpdate(
    { _id: id, stock: { $gte: -adjustment } },
    { $inc: { stock: adjustment } },
    { new: true }
  );

  if (!product) {
    const exists = await Product.findById(id);
    if (!exists) throw createError('Product not found', 404);
    throw createError('Insufficient stock for this dispatch', 400);
  }

  return product;
};

const deleteProduct = async (id) => {
  const product = await Product.findByIdAndDelete(id);
  if (!product) throw createError('Product not found', 404);
  return product;
};

module.exports = { getProducts, getProductById, createProduct, updateProduct, updateStock, deleteProduct };
