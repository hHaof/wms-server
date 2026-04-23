const mongoose = require('mongoose');

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Tên sản phẩm không được để trống'],
      trim: true,
      maxlength: [200, 'Tên tối đa 200 ký tự'],
    },
    // SKU is the unique business identifier (e.g. "WH-001")
    sku: {
      type: String,
      required: [true, 'SKU không được để trống'],
      unique: true,
      uppercase: true,
      trim: true,
      match: [/^[A-Z0-9_-]+$/, 'SKU chỉ chứa chữ hoa, số, gạch ngang'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [1000, 'Mô tả tối đa 1000 ký tự'],
    },
    category: {
      type: String,
      required: [true, 'Danh mục không được để trống'],
      trim: true,
    },
    price: {
      type: Number,
      required: [true, 'Giá không được để trống'],
      min: [0, 'Giá không được âm'],
      set: (v) => Math.round(v * 100) / 100,
    },
    unit: {
      type: String,
      enum: ['piece', 'kg', 'box', 'liter', 'meter'],
      default: 'piece',
    },
    stock: {
      type: Number,
      required: true,
      default: 0,
      min: [0, 'Tồn kho không được âm'],
    },
    // Low stock threshold for future alerting
    lowStockThreshold: {
      type: Number,
      default: 10,
      min: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  { timestamps: true }
);

productSchema.index({ sku: 1 });
productSchema.index({ category: 1 });
productSchema.index({ name: 'text', description: 'text' });

module.exports = mongoose.model('Product', productSchema);
