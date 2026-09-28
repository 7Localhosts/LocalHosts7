'use strict';

/**
 * models/Product.js — Product schema
 *
 * Stores product catalog entries. Compatible with the product data
 * structure used by the feature/3 storefront and feature/5 backend.
 */

const mongoose = require('mongoose');

const productSchema = new mongoose.Schema(
  {
    name:        { type: String, required: true, trim: true },
    price:       { type: Number, required: true, min: 0 },
    description: { type: String, default: '', trim: true },
    image:       { type: String, default: '' },
    category:    { type: String, default: '', trim: true },
    inStock:     { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Product', productSchema);
