'use strict';

/**
 * routes/reviews.js — Customer product reviews
 *
 * Endpoints:
 *   POST /api/reviews              → submit a review
 *   GET  /api/reviews/:productId   → list reviews + average rating for a product
 *
 * Validation rules:
 *   - productId : required string
 *   - name      : required, non-empty after trimming
 *   - rating    : required integer 1–5
 *   - comment   : required, non-empty, max 1000 characters
 *
 * Storage:
 *   When MongoDB is connected (MONGODB_URI set), reviews are persisted in the
 *   Review collection. Otherwise falls back to an in-memory array.
 */

const express        = require('express');
const { isConnected } = require('../db');
const Review          = require('../models/Review');

const router = express.Router();

// ─── In-memory fallback store ─────────────────────────────────────────────────
const _memReviews = [];

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/reviews
// Body: { productId, name, rating (1–5), comment }
// ─────────────────────────────────────────────────────────────────────────────
router.post('/', async (req, res) => {
  const { productId, name, rating, comment } = req.body;
  const errors = [];

  // ── Validate ──────────────────────────────────────────────────────────────
  if (!productId || String(productId).trim() === '') {
    errors.push('productId is required.');
  }
  if (!name || String(name).trim() === '') {
    errors.push('name is required.');
  }
  const ratingNum = Number(rating);
  if (!rating || !Number.isInteger(ratingNum) || ratingNum < 1 || ratingNum > 5) {
    errors.push('rating must be a whole number between 1 and 5.');
  }
  if (!comment || String(comment).trim() === '') {
    errors.push('comment is required.');
  } else if (String(comment).trim().length > 1000) {
    errors.push('comment must be 1000 characters or fewer.');
  }

  if (errors.length > 0) {
    return res.status(422).json({ error: 'Validation failed.', details: errors });
  }

  try {
    let review;

    if (isConnected()) {
      // ── Persist to MongoDB ───────────────────────────────────────────────
      const doc = await Review.create({
        productId: String(productId).trim(),
        name:      String(name).trim(),
        rating:    ratingNum,
        comment:   String(comment).trim(),
      });
      review = {
        id:        doc._id.toString(),
        productId: doc.productId,
        name:      doc.name,
        rating:    doc.rating,
        comment:   doc.comment,
        createdAt: doc.createdAt.toISOString(),
      };
    } else {
      // ── Fallback: in-memory ──────────────────────────────────────────────
      review = {
        id:        Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
        productId: String(productId).trim(),
        name:      String(name).trim(),
        rating:    ratingNum,
        comment:   String(comment).trim(),
        createdAt: new Date().toISOString(),
      };
      _memReviews.push(review);
    }

    return res.status(201).json({ status: 'success', data: review });
  } catch (err) {
    console.error('[Reviews POST]', err);
    return res.status(500).json({ error: 'Could not save review. Please try again.' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/reviews/:productId
// Returns all reviews for the given product + computed average rating.
// ─────────────────────────────────────────────────────────────────────────────
router.get('/:productId', async (req, res) => {
  const { productId } = req.params;

  try {
    let productReviews;

    if (isConnected()) {
      // ── Query MongoDB ────────────────────────────────────────────────────
      const docs = await Review.find({ productId: String(productId).trim() })
        .sort({ createdAt: -1 })  // newest first
        .lean();

      productReviews = docs.map(d => ({
        id:        d._id.toString(),
        productId: d.productId,
        name:      d.name,
        rating:    d.rating,
        comment:   d.comment,
        createdAt: d.createdAt.toISOString(),
      }));
    } else {
      // ── Fallback: in-memory ──────────────────────────────────────────────
      productReviews = _memReviews
        .filter(r => r.productId === String(productId).trim())
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }

    const count   = productReviews.length;
    const average = count
      ? Math.round((productReviews.reduce((sum, r) => sum + r.rating, 0) / count) * 10) / 10
      : 0;

    return res.json({
      status: 'success',
      data: {
        productId,
        count,
        average,   // e.g. 4.3
        reviews: productReviews,
      },
    });
  } catch (err) {
    console.error('[Reviews GET]', err);
    return res.status(500).json({ error: 'Could not load reviews. Please try again.' });
  }
});

module.exports = router;
