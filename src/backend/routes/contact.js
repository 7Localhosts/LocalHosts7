'use strict';

/**
 * routes/contact.js — Contact form submissions
 *
 * Endpoint:
 *   POST /api/contact
 *   Body: { name, email, phone?, subject?, message }
 *
 * On success the message is:
 *   1. Persisted to MongoDB (when connected) as an audit log
 *   2. Logged to the console (always — useful as a fallback)
 *   3. Emailed to CONTACT_EMAIL via Nodemailer (when SMTP vars are set)
 */

const express        = require('express');
const nodemailer     = require('nodemailer');
const { isConnected } = require('../db');
const ContactSubmission = require('../models/ContactSubmission');

const router = express.Router();

// ─── Nodemailer transporter ───────────────────────────────────────────────────
// Only initialised when all SMTP environment variables are present.
// If they're missing the server still accepts submissions and logs them.
let mailer = null;

function getMailer() {
  if (mailer) return mailer;

  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;

  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    return null; // SMTP not configured — submissions are logged only
  }

  mailer = nodemailer.createTransport({
    host:   SMTP_HOST,
    port:   Number(SMTP_PORT) || 587,
    secure: Number(SMTP_PORT) === 465, // true for port 465 (SSL), false for STARTTLS
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });

  return mailer;
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/contact
// ─────────────────────────────────────────────────────────────────────────────
router.post('/', async (req, res) => {
  const { name, email, phone = '', subject = 'Contact Form Enquiry', message } = req.body;
  const errors = [];

  // ── Validate ──────────────────────────────────────────────────────────────
  if (!name || String(name).trim() === '') errors.push('name is required.');
  if (!email || !/^\S+@\S+\.\S+$/.test(String(email).trim())) {
    errors.push('A valid email address is required.');
  }
  if (!message || String(message).trim() === '') errors.push('message is required.');
  if (message && String(message).trim().length > 2000) {
    errors.push('message must be 2000 characters or fewer.');
  }

  if (errors.length > 0) {
    return res.status(422).json({ error: 'Validation failed.', details: errors });
  }

  const submission = {
    name:    String(name).trim(),
    email:   String(email).trim(),
    phone:   String(phone).trim(),
    subject: String(subject).trim(),
    message: String(message).trim(),
  };

  // ── Persist to MongoDB (audit log) ───────────────────────────────────────
  if (isConnected()) {
    try {
      await ContactSubmission.create(submission);
    } catch (dbErr) {
      // Non-fatal — still process the submission
      console.error('[Contact] DB save failed:', dbErr.message);
    }
  }

  // ── Log submission (always) ───────────────────────────────────────────────
  console.log('[Contact form submission]', { ...submission, createdAt: new Date().toISOString() });

  // ── Attempt email delivery ────────────────────────────────────────────────
  const transport = getMailer();
  if (transport) {
    try {
      await transport.sendMail({
        from:    `"Kay's Haven Website" <${process.env.SMTP_USER}>`,
        to:      process.env.CONTACT_EMAIL || process.env.SMTP_USER,
        replyTo: submission.email,
        subject: `[Kay's Haven] ${submission.subject}`,
        text: [
          `Name:    ${submission.name}`,
          `Email:   ${submission.email}`,
          `Phone:   ${submission.phone || 'not provided'}`,
          ``,
          `Message:`,
          submission.message,
          ``,
          `Received: ${new Date().toISOString()}`,
        ].join('\n'),
      });
    } catch (mailErr) {
      // Email failure is non-fatal — the message is already logged and saved
      console.error('[Contact] Email delivery failed:', mailErr.message);
    }
  } else {
    console.warn('[Contact] SMTP not configured — submission logged only. Set SMTP_* env vars to enable email delivery.');
  }

  return res.json({
    status: 'success',
    message: "Thank you for reaching out! We'll get back to you within 24 hours.",
  });
});

module.exports = router;
