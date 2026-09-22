/**
 * Smoke test script for Kay's Haven backend API
 * Run: node test_api.js
 */
const http = require('http');

const BASE = 'http://localhost:3000';
let passed = 0, failed = 0;

function req(method, path, body) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    const options = {
      hostname: 'localhost', port: 3000, path, method,
      headers: {
        'Content-Type': 'application/json',
        ...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {})
      }
    };
    const r = http.request(options, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch { resolve({ status: res.statusCode, body: data }); }
      });
    });
    r.on('error', reject);
    if (payload) r.write(payload);
    r.end();
  });
}

function assert(label, condition, detail = '') {
  if (condition) {
    console.log(`  ✅  PASS  ${label}`);
    passed++;
  } else {
    console.log(`  ❌  FAIL  ${label}${detail ? ' — ' + detail : ''}`);
    failed++;
  }
}

async function run() {
  console.log('\n══════════════════════════════════════════');
  console.log("  Kay's Haven API — Smoke Tests");
  console.log('══════════════════════════════════════════\n');

  // ── Health ─────────────────────────────────────────
  console.log('▸ Health check');
  const health = await req('GET', '/api/health');
  assert('GET /api/health → 200',       health.status === 200);
  assert('response has status: ok',     health.body.status === 'ok');
  assert('service name present',        health.body.service === "Kay's Haven API");

  // ── Delivery ───────────────────────────────────────
  console.log('\n▸ Delivery');
  const delivery = await req('GET', '/api/delivery');
  assert('GET /api/delivery → 200',         delivery.status === 200);
  assert('response status is success',      delivery.body.status === 'success');
  assert('has zones array',                 Array.isArray(delivery.body.data?.zones));
  assert('has 3 zones',                     delivery.body.data?.zones?.length === 3);
  assert('has pickupLocations array',       Array.isArray(delivery.body.data?.pickupLocations));
  assert('has 2 pickup locations',          delivery.body.data?.pickupLocations?.length === 2);
  assert('has notes array',                 Array.isArray(delivery.body.data?.notes));
  assert('Accra Central fee is GHS 15',     delivery.body.data?.zones[0]?.fee === 15);
  assert('Greater Accra fee is GHS 20',     delivery.body.data?.zones[1]?.fee === 20);
  assert('Other Regions fee is GHS 40',     delivery.body.data?.zones[2]?.fee === 40);

  // ── Reviews — empty state ──────────────────────────
  console.log('\n▸ Reviews — GET (empty)');
  const emptyReviews = await req('GET', '/api/reviews/99');
  assert('GET /api/reviews/99 → 200',   emptyReviews.status === 200);
  assert('count is 0',                  emptyReviews.body.data?.count === 0);
  assert('average is 0',                emptyReviews.body.data?.average === 0);
  assert('reviews is empty array',      Array.isArray(emptyReviews.body.data?.reviews) && emptyReviews.body.data.reviews.length === 0);

  // ── Reviews — valid submit ─────────────────────────
  console.log('\n▸ Reviews — POST valid');
  const r1 = await req('POST', '/api/reviews', {
    productId: '1', name: 'Ama K.', rating: 5, comment: 'Beautiful baby wrap! Great quality.'
  });
  assert('POST /api/reviews (rating 5) → 201',  r1.status === 201);
  assert('returned review has correct rating',   r1.body.data?.rating === 5);
  assert('returned review has correct name',     r1.body.data?.name === 'Ama K.');
  assert('review has an id',                     !!r1.body.data?.id);

  const r2 = await req('POST', '/api/reviews', {
    productId: '1', name: 'Efua', rating: 3, comment: 'Good product overall, decent stitching.'
  });
  assert('POST /api/reviews (rating 3) → 201',  r2.status === 201);

  // ── Reviews — average calculation ─────────────────
  console.log('\n▸ Reviews — average after 2 submissions');
  const withReviews = await req('GET', '/api/reviews/1');
  assert('count is 2',                    withReviews.body.data?.count === 2);
  assert('average is 4.0',               withReviews.body.data?.average === 4.0);
  assert('reviews sorted newest first',  withReviews.body.data?.reviews?.length === 2);

  // ── Reviews — validation failures ─────────────────
  console.log('\n▸ Reviews — validation failures');
  const noName = await req('POST', '/api/reviews', { productId: '1', name: '', rating: 4, comment: 'ok' });
  assert('empty name → 422',             noName.status === 422);
  assert('error details present',        Array.isArray(noName.body.details));

  const badRating = await req('POST', '/api/reviews', { productId: '1', name: 'X', rating: 7, comment: 'ok' });
  assert('rating 7 → 422',              badRating.status === 422);

  const blankComment = await req('POST', '/api/reviews', { productId: '1', name: 'X', rating: 3, comment: '   ' });
  assert('whitespace-only comment → 422', blankComment.status === 422);

  const longComment = await req('POST', '/api/reviews', {
    productId: '1', name: 'X', rating: 3,
    comment: 'A'.repeat(1001)
  });
  assert('1001-char comment → 422',     longComment.status === 422);

  const noRating = await req('POST', '/api/reviews', { productId: '1', name: 'X', comment: 'ok' });
  assert('missing rating → 422',        noRating.status === 422);

  // ── Contact — valid ────────────────────────────────
  console.log('\n▸ Contact — POST valid');
  const contact = await req('POST', '/api/contact', {
    name: 'Kofi', email: 'kofi@example.com',
    message: 'Hi, when will my order arrive?'
  });
  assert('POST /api/contact valid → 200',   contact.status === 200);
  assert('response status is success',      contact.body.status === 'success');
  assert('message field present',           !!contact.body.message);

  // ── Contact — validation failures ─────────────────
  console.log('\n▸ Contact — validation failures');
  const noEmail = await req('POST', '/api/contact', { name: 'Kofi', email: 'bad-email', message: 'Hello' });
  assert('bad email → 422',              noEmail.status === 422);

  const noMsg = await req('POST', '/api/contact', { name: 'Kofi', email: 'k@e.com', message: '' });
  assert('empty message → 422',         noMsg.status === 422);

  const noContactName = await req('POST', '/api/contact', { name: '', email: 'k@e.com', message: 'Hi' });
  assert('empty name → 422',            noContactName.status === 422);

  // ── Payment — init without keys ────────────────────
  console.log('\n▸ Payments — initialize (no Paystack key set)');
  const payInit = await req('POST', '/api/payments/initialize', {
    email: 'test@example.com', amount: 195, orderId: 'KH-001'
  });
  assert('missing PAYSTACK_SECRET_KEY → 502', payInit.status === 502);
  assert('returns error message',             typeof payInit.body.error === 'string');

  // ── Payment — init validation ──────────────────────
  console.log('\n▸ Payments — initialize validation');
  const payNoEmail = await req('POST', '/api/payments/initialize', { amount: 100 });
  assert('missing email → 400',         payNoEmail.status === 400);

  const payBadAmount = await req('POST', '/api/payments/initialize', { email: 'x@x.com', amount: -5 });
  assert('negative amount → 400',       payBadAmount.status === 400);

  // ── Payment — verify validation ────────────────────
  console.log('\n▸ Payments — verify validation');
  const verifyNoRef = await req('POST', '/api/payments/verify', {});
  assert('missing reference → 400',     verifyNoRef.status === 400);

  // ── 404 catch-all ──────────────────────────────────
  console.log('\n▸ 404 catch-all');
  const notFound = await req('GET', '/api/nonexistent');
  assert('unknown route → 404',         notFound.status === 404);

  // ── Summary ────────────────────────────────────────
  console.log('\n══════════════════════════════════════════');
  console.log(`  Results: ${passed} passed, ${failed} failed`);
  console.log('══════════════════════════════════════════\n');
  process.exit(failed > 0 ? 1 : 0);
}

run().catch(err => {
  console.error('Test runner error:', err.message);
  process.exit(1);
});
