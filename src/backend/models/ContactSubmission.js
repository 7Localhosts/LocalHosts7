'use strict';

/**
 * models/ContactSubmission.js — Mongoose schema for contact form submissions
 *
 * Stored as an audit log even when email delivery succeeds.
 */

const mongoose = require('mongoose');

const contactSchema = new mongoose.Schema({
  name:    { type: String, required: true },
  email:   { type: String, required: true },
  phone:   { type: String, default: '' },
  subject: { type: String, default: 'Contact Form Enquiry' },
  message: { type: String, required: true },
}, {
  timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' },
});

module.exports = mongoose.model('ContactSubmission', contactSchema);
