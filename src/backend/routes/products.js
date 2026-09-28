'use strict';

/**
 * routes/products.js — Product catalog
 *
 * Endpoints:
 *   GET  /api/products       → list all products
 *   GET  /api/products/:id   → get a single product by ID
 *
 * Provides the same API shape as the feature/5 Supabase backend so the
 * storefront frontend works without changes.
 *
 * Storage:
 *   When MongoDB is connected, products are read from the Product collection.
 *   Otherwise returns a fallback in-memory catalog.
 */

const express        = require('express');
const { isConnected } = require('../db');
const Product         = require('../models/Product');

const router = express.Router();

// ─── Fallback product catalog (used when no DB is connected) ─────────────────
// These mirror the products shown in the storefront so local dev works
// without a database.
const _fallbackProducts = [
  { id: '1', name: 'Gift Hamper – Classic',      price: 150, category: 'Hampers',    inStock: true, image: '' },
  { id: '2', name: 'Gift Hamper – Premium',      price: 350, category: 'Hampers',    inStock: true, image: '' },
  { id: '3', name: 'Scented Candle Set',          price: 80,  category: 'Candles',    inStock: true, image: '' },
  { id: '4', name: 'Luxury Skincare Bundle',      price: 220, category: 'Skincare',   inStock: true, image: '' },
  { id: '5', name: 'Chocolate Box – Assorted',    price: 95,  category: 'Chocolates', inStock: true, image: '' },
  { id: '6', name: 'Flower Bouquet – Roses',      price: 120, category: 'Flowers',    inStock: true, image: '' },
];

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/products
// ─────────────────────────────────────────────────────────────────────────────
router.get('/', async (_req, res) => {
  try {
    let products;

    if (isConnected()) {
      const docs = await Product.find().lean();
      products = docs.map(d => ({
        id:          d._id.toString(),
        name:        d.name,
        price:       d.price,
        description: d.description,
        image:       d.image,
        category:    d.category,
        inStock:     d.inStock,
      }));
    } else {
      products = _fallbackProducts;
    }

    return res.json({ status: 'success', products });
  } catch (err) {
    console.error('[Products GET]', err);
    return res.status(500).json({ error: 'Could not load products.' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/products/:id
// ─────────────────────────────────────────────────────────────────────────────
router.get('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    let product;

    if (isConnected()) {
      const doc = await Product.findById(id).lean();
      if (!doc) return res.status(404).json({ error: 'Product not found.' });
      product = {
        id:          doc._id.toString(),
        name:        doc.name,
        price:       doc.price,
        description: doc.description,
        image:       doc.image,
        category:    doc.category,
        inStock:     doc.inStock,
      };
    } else {
      product = _fallbackProducts.find(p => p.id === id);
      if (!product) return res.status(404).json({ error: 'Product not found.' });
    }

    return res.json({ status: 'success', data: product });
  } catch (err) {
    console.error('[Products GET :id]', err);
    return res.status(500).json({ error: 'Could not load product.' });
  }
});

module.exports = router;
