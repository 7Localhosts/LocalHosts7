'use strict';

/**
 * routes/delivery.js — Delivery information
 *
 * Endpoint:
 *   GET /api/delivery  → returns delivery zones, fees, pickup locations and notes
 *
 * Data is sourced from config/delivery.js so business updates never
 * require touching route code.
 */

const express        = require('express');
const deliveryConfig = require('../config/delivery');

const router = express.Router();

// GET /api/delivery
router.get('/', (req, res) => {
  res.json({ status: 'success', data: deliveryConfig });
});

module.exports = router;
