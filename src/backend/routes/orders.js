'use strict';

/**
 * routes/orders.js — Order management
 *
 * Endpoints:
 *   POST /api/orders   → create a new order
 *
 * Provides the same API shape as the feature/5 Supabase backend so the
 * checkout frontend works without changes.
 *
 * Storage:
 *   When MongoDB is connected, orders are persisted in the Order collection.
 *   Otherwise falls back to in-memory storage.
 */

const express        = require('express');
const { isConnected } = require('../db');
const Order           = require('../models/Order');

const router = express.Router();

// ─── In-memory fallback store ─────────────────────────────────────────────────
const _memOrders = [];

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/orders
// Body: { customerName, email?, shippingAddress, cart: [{ id, name, price, quantity }] }
// ─────────────────────────────────────────────────────────────────────────────
router.post('/', async (req, res) => {
  const { customerName, email, shippingAddress, cart } = req.body;

  // ── Validate ──────────────────────────────────────────────────────────────
  if (!customerName || !shippingAddress || !Array.isArray(cart) || !cart.length) {
    return res.status(400).json({ error: 'Missing required order data' });
  }

  const totalAmount = cart.reduce(
    (sum, item) => sum + Number(item.price) * Number(item.quantity || item.qty || 1),
    0
  );

  const orderItems = cart.map(item => ({
    productId:   item.id || item.productId || '',
    productName: item.name || item.productName || '',
    quantity:    Number(item.quantity || item.qty || 1),
    price:       Number(item.price),
  }));

  try {
    let order;

    if (isConnected()) {
      const doc = await Order.create({
        customerName,
        email: email || null,
        shippingAddress,
        totalAmount,
        status: 'pending',
        items: orderItems,
      });

      order = {
        id:              doc._id.toString(),
        customerName:    doc.customerName,
        email:           doc.email,
        shippingAddress: doc.shippingAddress,
        totalAmount:     doc.totalAmount,
        status:          doc.status,
        items:           doc.items,
        createdAt:       doc.createdAt.toISOString(),
      };
    } else {
      order = {
        id:              'order-' + Date.now().toString(36),
        customerName,
        email: email || null,
        shippingAddress,
        totalAmount,
        status: 'pending',
        items: orderItems,
        createdAt: new Date().toISOString(),
      };
      _memOrders.push(order);
    }

    return res.status(201).json({
      message: 'Order created successfully',
      order,
    });
  } catch (err) {
    console.error('[Orders POST]', err);
    return res.status(500).json({ error: 'Could not create order. Please try again.' });
  }
});

module.exports = router;
