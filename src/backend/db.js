'use strict';

/**
 * db.js — MongoDB connection via Mongoose
 *
 * Usage:
 *   const { connect, isConnected } = require('./db');
 *   await connect(); // call once in server.js
 *
 * Set MONGODB_URI in your .env:
 *   MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/kayshaven?retryWrites=true&w=majority
 */

const mongoose = require('mongoose');

let _connected = false;

/**
 * Connect to MongoDB. Safe to call multiple times — only connects once.
 */
async function connect() {
  if (_connected) return;

  const uri = process.env.MONGODB_URI;

  if (!uri) {
    console.warn(
      '⚠️   MONGODB_URI is not set — running with in-memory stores.\n' +
      '     Set MONGODB_URI in .env to persist data across restarts.'
    );
    return;
  }

  try {
    await mongoose.connect(uri);
    _connected = true;
    console.log('✅  MongoDB connected');
  } catch (err) {
    console.error('❌  MongoDB connection failed:', err.message);
    console.warn('    Falling back to in-memory stores.');
  }
}

/**
 * Returns true if Mongoose has an open connection.
 */
function isConnected() {
  return mongoose.connection.readyState === 1;
}

module.exports = { connect, isConnected };
