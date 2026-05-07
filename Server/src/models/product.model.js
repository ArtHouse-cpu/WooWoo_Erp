import mongoose from 'mongoose';

const variantSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    sellingPrice: { type: Number, required: true, min: 0 },
    purchasePrice: { type: Number, required: true, min: 0 },
    barcode: { type: String, trim: true, default: '' },
  },
  { _id: false }
);

const productSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['product', 'service'],
      default: 'product',
    },
    productName: {
      type: String,
      required: true,
      trim: true,
    },
    serviceName: {
      type: String,
      trim: true,
      default: '',
    },
    sellingPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    purchasePrice: {
      type: Number,
      default: 0,
      min: 0,
    },
    itemCode: {
      type: String,
      trim: true,
      default: '',
    },
    barCode: {
      type: String,
      trim: true,
      default: '',
    },
    categoryId: {
      type: String,
      trim: true,
      default: '',
    },
    category: {
      type: String,
      trim: true,
      default: 'General',
    },
    itemType: {
      type: String,
      enum: ['product', 'service'],
      default: 'product',
    },
    primaryUnit: {
      type: String,
      trim: true,
      default: '',
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    discountType: {
      type: String,
      enum: ['flat', 'percentage'],
      default: 'flat',
    },
    discountValue: {
      type: Number,
      default: 0,
      min: 0,
    },
    stockQty: {
      type: Number,
      default: 0,
    },
    stockStatus: {
      type: String,
      enum: ['in_stock', 'out_of_stock'],
      default: 'in_stock',
    },
    imageUrl: {
      type: String,
      default: null,
    },
    images: {
      type: [String],
      default: [],
    },
    variants: {
      type: [variantSchema],
      default: [],
    },
  },
  { timestamps: true }
);

const Product = mongoose.model('Product', productSchema);
export default Product;
