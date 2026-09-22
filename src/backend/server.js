'use strict';

/**
 * server.js — Kay's Haven backend entry point
 *
 * Start: node server.js
 * Env:   copy .env.example → .env, fill in values
 */

require('dotenv').config();

const express        = require('express');
const cors           = require('cors');
const paymentsRouter = require('./routes/payments');
const reviewsRouter  = require('./routes/reviews');
const contactRouter  = require('./routes/contact');
const deliveryRouter = require('./routes/delivery');

const app  = express();
const PORT = process.env.PORT || 3000;

// ─── CORS ─────────────────────────────────────────────────────────────────────
// In development this allows the Live Server origin.
// For production, set FRONTEND_URL to the real domain.
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://127.0.0.1:5500',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type'],
}));

// ─── Webhook MUST be registered BEFORE express.json() ────────────────────────
// Paystack's HMAC-SHA512 signature is computed over the raw request body.
// If express.json() runs first, the body is already parsed and we lose the
// original Buffer — the signature check will always fail.
app.post(
  '/api/payments/webhook',
  express.raw({ type: 'application/json' }),  // capture raw Buffer
  (req, res, next) => {
    // Delegate to the payments router's /webhook handler
    // We re-path so the router matches correctly
    req.url = '/webhook';
    paymentsRouter(req, res, next);
  }
);

// ─── Global middleware ────────────────────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// ─── API Routes ───────────────────────────────────────────────────────────────
app.use('/api/payments', paymentsRouter);
app.use('/api/reviews',  reviewsRouter);
app.use('/api/contact',  contactRouter);
app.use('/api/delivery', deliveryRouter);

// ─── Health check ─────────────────────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', service: "Kay's Haven API", timestamp: new Date().toISOString() });
});

// ─── 404 catch-all ────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ error: 'Route not found.' });
});

// ─── Global error handler ─────────────────────────────────────────────────────
// Returns meaningful errors without exposing raw stack traces to clients.
app.use((err, _req, res, _next) => {
  console.error('[Unhandled error]', err);
  res.status(500).json({ error: 'An unexpected error occurred. Please try again.' });
});

// ─── Start server ─────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`✅  Kay's Haven API running on http://localhost:${PORT}`);
  if (!process.env.PAYSTACK_SECRET_KEY) {
    console.warn('⚠️   PAYSTACK_SECRET_KEY is not set — payment routes will fail.');
  }
});
