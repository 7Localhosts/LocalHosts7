'use strict';

/**
 * models/Order.js — Order schema
 *
 * Stores customer orders with line items. Compatible with the order data
 * structure used by the feature/4 checkout and feature/5 backend.
 */

const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema(
  {
    productId:   { type: String, required: true },
    productName: { type: String, required: true },
    quantity:    { type: Number, required: true, min: 1 },
    price:       { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    customerName:    { type: String, required: true, trim: true },
    email:           { type: String, default: null, trim: true },
    shippingAddress: { type: String, required: true, trim: true },
    totalAmount:     { type: Number, required: true, min: 0 },
    status:          { type: String, default: 'pending', enum: ['pending', 'processing', 'completed', 'cancelled'] },
    items:           [orderItemSchema],
  },
  { timestamps: true }
);

module.exports = mongoose.model('Order', orderSchema);
