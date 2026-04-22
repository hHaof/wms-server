const mongoose = require('mongoose');

// Snapshot of product at order time — preserved even if product is later edited/deleted
const orderItemSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    sku: { type: String, required: true },
    name: { type: String, required: true },
    price: { type: Number, required: true },
    quantity: { type: Number, required: true, min: [1, 'Số lượng tối thiểu là 1'] },
    subtotal: { type: Number, required: true },
  },
  { _id: false }
);

const statusHistorySchema = new mongoose.Schema(
  {
    status: { type: String, required: true },
    changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    note: { type: String, trim: true },
  },
  { timestamps: true }
);

const STATUS = {
  PENDING: 'pending',
  PACKED: 'packed',
  SHIPPED: 'shipped',
};

// Allowed transitions: key → allowed next statuses
const STATUS_TRANSITIONS = {
  [STATUS.PENDING]: [STATUS.PACKED],
  [STATUS.PACKED]: [STATUS.SHIPPED],
  [STATUS.SHIPPED]: [],
};

const orderSchema = new mongoose.Schema(
  {
    orderNumber: { type: String, required: true, unique: true },
    customer: {
      name: { type: String, required: [true, 'Tên khách hàng không được để trống'], trim: true },
      phone: { type: String, required: [true, 'Số điện thoại không được để trống'], trim: true },
      address: { type: String, required: [true, 'Địa chỉ không được để trống'], trim: true },
    },
    items: {
      type: [orderItemSchema],
      validate: { validator: (v) => v.length > 0, message: 'Đơn hàng cần ít nhất 1 sản phẩm' },
    },
    totalAmount: { type: Number, required: true, min: 0 },
    status: {
      type: String,
      enum: Object.values(STATUS),
      default: STATUS.PENDING,
    },
    statusHistory: [statusHistorySchema],
    // Packer assigned to pack this order
    assignedPacker: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    note: { type: String, trim: true, maxlength: 500 },
    shippingInfo: {
      size: { type: String, trim: true },
      designLink: { type: String, trim: true },
      mockupLink: { type: String, trim: true },
      labelLink: { type: String, trim: true },
    },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

orderSchema.index({ status: 1, createdAt: -1 });
orderSchema.index({ assignedPacker: 1, status: 1 });
orderSchema.index({ orderNumber: 1 });

module.exports = mongoose.model('Order', orderSchema);
module.exports.STATUS = STATUS;
module.exports.STATUS_TRANSITIONS = STATUS_TRANSITIONS;
