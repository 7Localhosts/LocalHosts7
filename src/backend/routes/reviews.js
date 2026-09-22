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
 */

const express = require('express');
const router  = express.Router();

// ─── In-memory reviews store ──────────────────────────────────────────────────
// TODO: replace with DB queries (e.g. MongoDB/Mongoose, Sequelize, Prisma)
//       once the backend-database teammate lands their DB layer.
const reviews = [];

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/reviews
// Body: { productId, name, rating (1–5), comment }
// ─────────────────────────────────────────────────────────────────────────────
router.post('/', (req, res) => {
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

  // ── Persist ───────────────────────────────────────────────────────────────
  const review = {
    id:        Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    productId: String(productId).trim(),
    name:      String(name).trim(),
    rating:    ratingNum,
    comment:   String(comment).trim(),
    createdAt: new Date().toISOString(),
  };

  reviews.push(review);

  return res.status(201).json({ status: 'success', data: review });
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/reviews/:productId
// Returns all reviews for the given product + computed average rating.
// ─────────────────────────────────────────────────────────────────────────────
router.get('/:productId', (req, res) => {
  const { productId } = req.params;

  const productReviews = reviews
    .filter(r => r.productId === String(productId).trim())
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)); // newest first

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
});

module.exports = router;
