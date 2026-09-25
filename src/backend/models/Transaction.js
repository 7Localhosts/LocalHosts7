'use strict';

/**
 * models/Transaction.js — Mongoose schema for payment transactions
 */

const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  reference:          { type: String, required: true, unique: true, index: true },
  orderId:            { type: String },
  email:              { type: String, required: true },
  amount:             { type: Number, required: true },   // GHS
  status:             { type: String, default: 'pending' }, // pending | success | failed | abandoned
  channel:            { type: String, default: null },
  paystackReference:  { type: String, default: null },
  paidAt:             { type: Date,   default: null },
  webhookConfirmed:   { type: Boolean, default: false },
}, {
  timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' },
});

module.exports = mongoose.model('Transaction', transactionSchema);
