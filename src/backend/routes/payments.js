'use strict';

/**
 * routes/payments.js — Paystack payment integration
 *
 * Endpoints:
 *   POST /api/payments/initialize  → create Paystack transaction, return access_code
 *   POST /api/payments/verify      → server-side verification after popup closes
 *   POST /api/payments/webhook     → Paystack event webhook (signature-verified)
 *
 * NOTE: The webhook route MUST be mounted BEFORE express.json() in server.js
 *       so we receive the raw body buffer needed for HMAC-SHA512 verification.
 */

const crypto  = require('crypto');
const express = require('express');
const axios   = require('axios');

const router = express.Router();

// ─── In-memory transaction store ────────────────────────────────────────────
// TODO: replace with a real database (MongoDB/MySQL/Postgres) once the
//       backend-database teammate sets up the DB layer.
const transactions = new Map();

// ─── Helper: call Paystack REST API ──────────────────────────────────────────
const paystack = axios.create({
  baseURL: 'https://api.paystack.co',
  headers: {
    Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
    'Content-Type': 'application/json',
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/payments/initialize
// Body: { email, amount (GHS), orderId, customerName, metadata? }
// Returns: { access_code, reference, publicKey }
// ─────────────────────────────────────────────────────────────────────────────
router.post('/initialize', async (req, res) => {
  const { email, amount, orderId, customerName, metadata = {} } = req.body;

  // ── Validate inputs ──────────────────────────────────────────────────────
  if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
    return res.status(400).json({ error: 'A valid email address is required.' });
  }
  if (!amount || Number(amount) <= 0) {
    return res.status(400).json({ error: 'amount must be a positive number (in GHS).' });
  }

  // ── Generate a unique order reference ───────────────────────────────────
  const reference =
    'KH-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8).toUpperCase();

  try {
    const paystackRes = await paystack.post('/transaction/initialize', {
      email,
      // Paystack amounts are in the smallest currency unit (pesewas = GHS × 100)
      amount: Math.round(Number(amount) * 100),
      currency: 'GHS',
      reference,
      // Expose all available Ghanaian payment channels
      channels: ['mobile_money', 'card', 'bank_transfer', 'ussd', 'qr'],
      label: "Kay's Haven",
      metadata: {
        ...metadata,
        orderId,
        customerName,
        custom_fields: [
          { display_name: 'Order ID', variable_name: 'order_id', value: orderId },
          { display_name: 'Customer',  variable_name: 'customer', value: customerName },
        ],
      },
    });

    // ── Persist pending transaction locally ────────────────────────────────
    transactions.set(reference, {
      reference,
      orderId,
      email,
      amount: Number(amount),
      status: 'pending',
      channel: null,
      paystackReference: null,
      paidAt: null,
      createdAt: new Date().toISOString(),
    });

    return res.json({
      status: 'success',
      data: {
        accessCode:  paystackRes.data.data.access_code,
        authorizationUrl: paystackRes.data.data.authorization_url,
        reference,
        // Safe to expose — the public key is designed to be client-side
        publicKey: process.env.PAYSTACK_PUBLIC_KEY,
      },
    });
  } catch (err) {
    const message = err.response?.data?.message || 'Could not initialise payment. Please try again.';
    console.error('[Paystack /initialize]', message);
    return res.status(502).json({ error: message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/payments/verify
// Body: { reference }
// Called by the frontend after the Paystack popup reports success/failure.
// We NEVER trust the popup result alone — we re-verify server-side.
// ─────────────────────────────────────────────────────────────────────────────
router.post('/verify', async (req, res) => {
  const { reference } = req.body;

  if (!reference) {
    return res.status(400).json({ error: 'reference is required.' });
  }

  try {
    const paystackRes = await paystack.get(
      `/transaction/verify/${encodeURIComponent(reference)}`
    );

    const tx = paystackRes.data.data;
    // Possible statuses: 'success', 'failed', 'abandoned', 'pending'
    const status = tx.status;

    // ── Update local record ────────────────────────────────────────────────
    if (transactions.has(reference)) {
      const local = transactions.get(reference);
      Object.assign(local, {
        status,
        channel:            tx.channel,
        paystackReference:  tx.reference,
        paidAt:             tx.paid_at,
        updatedAt:          new Date().toISOString(),
      });
      transactions.set(reference, local);
    }

    return res.json({
      status: 'success',
      data: {
        paymentStatus: status,         // 'success' | 'failed' | 'abandoned' | 'pending'
        reference,
        amount:   tx.amount / 100,     // convert pesewas → GHS
        channel:  tx.channel,          // 'mobile_money' | 'card' | etc.
        paidAt:   tx.paid_at,
        orderId:  tx.metadata?.orderId,
        message:  statusMessage(status),
      },
    });
  } catch (err) {
    const message = err.response?.data?.message || 'Could not verify payment.';
    console.error('[Paystack /verify]', message);
    return res.status(502).json({ error: message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/payments/webhook
// Paystack sends signed events here.  We verify the HMAC-SHA512 signature
// using PAYSTACK_SECRET_KEY before processing ANY event data.
//
// IMPORTANT: This route is registered with express.raw() in server.js
// (before express.json()) so req.body is the raw Buffer we need for hashing.
// ─────────────────────────────────────────────────────────────────────────────
router.post('/webhook', (req, res) => {
  // Respond 200 immediately — Paystack re-tries if it doesn't get a fast 200
  res.sendStatus(200);

  const signature = req.headers['x-paystack-signature'];

  if (!signature) {
    console.warn('[Webhook] Request missing x-paystack-signature — ignored.');
    return;
  }

  // ── Verify HMAC-SHA512 signature ─────────────────────────────────────────
  // req.body is a raw Buffer (express.raw middleware applied in server.js)
  const expectedHash = crypto
    .createHmac('sha512', process.env.PAYSTACK_SECRET_KEY)
    .update(req.body)           // must use the raw buffer, not parsed JSON
    .digest('hex');

  if (expectedHash !== signature) {
    console.warn('[Webhook] Signature mismatch — event discarded.');
    return;
  }

  // ── Parse and handle events ───────────────────────────────────────────────
  let event;
  try {
    event = JSON.parse(req.body.toString('utf8'));
  } catch {
    console.warn('[Webhook] Failed to parse event body.');
    return;
  }

  console.log(`[Webhook] Received event: ${event.event}`);

  switch (event.event) {
    case 'charge.success': {
      const { reference, status, channel, paid_at, metadata } = event.data;

      if (transactions.has(reference)) {
        const local = transactions.get(reference);
        Object.assign(local, {
          status:    status,
          channel:   channel,
          paidAt:    paid_at,
          webhookConfirmed: true,
          updatedAt: new Date().toISOString(),
        });
        transactions.set(reference, local);
      }

      console.log(`[Webhook] charge.success — ref: ${reference}, order: ${metadata?.orderId}`);
      break;
    }

    // Add more event handlers here as needed (e.g. 'charge.failed',
    // 'transfer.success', 'refund.processed')
    default:
      console.log(`[Webhook] Unhandled event type: ${event.event}`);
  }
});

// ─── Helper: human-readable status message ───────────────────────────────────
function statusMessage(status) {
  const map = {
    success:   'Payment received successfully.',
    failed:    'Payment failed. Please try a different card or payment method.',
    abandoned: 'Payment was not completed. You can try again.',
    pending:   "Payment is pending. We'll notify you once it's confirmed.",
  };
  return map[status] || 'Unknown payment status.';
}

module.exports = router;
