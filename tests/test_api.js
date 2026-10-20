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
  const testPid = 'smoke_test_' + Date.now();
  const emptyReviews = await req('GET', `/api/reviews/${testPid}`);
  assert(`GET /api/reviews/${testPid} → 200`, emptyReviews.status === 200);
  assert('count is 0',                        emptyReviews.body.data?.count === 0);
  assert('average is 0',                      emptyReviews.body.data?.average === 0);
  assert('reviews is empty array',            Array.isArray(emptyReviews.body.data?.reviews) && emptyReviews.body.data.reviews.length === 0);

  // ── Reviews — valid submit ─────────────────────────
  console.log('\n▸ Reviews — POST valid');
  const r1 = await req('POST', '/api/reviews', {
    productId: testPid, name: 'Ama K.', rating: 5, comment: 'Beautiful baby wrap! Great quality.'
  });
  assert('POST /api/reviews (rating 5) → 201',  r1.status === 201);
  assert('returned review has correct rating',   r1.body.data?.rating === 5);
  assert('returned review has correct name',     r1.body.data?.name === 'Ama K.');
  assert('review has an id',                     !!r1.body.data?.id);

  const r2 = await req('POST', '/api/reviews', {
    productId: testPid, name: 'Efua', rating: 3, comment: 'Good product overall, decent stitching.'
  });
  assert('POST /api/reviews (rating 3) → 201',  r2.status === 201);

  // ── Reviews — average calculation ─────────────────
  console.log('\n▸ Reviews — average after 2 submissions');
  const withReviews = await req('GET', `/api/reviews/${testPid}`);
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
  console.log('\n▸ Payments — initialize (no Paystack key set or success)');
  const payInit = await req('POST', '/api/payments/initialize', {
    email: 'test@example.com', amount: 195, orderId: 'KH-001'
  });
  assert('missing PAYSTACK_SECRET_KEY → 502 or success → 200', [200, 502].includes(payInit.status));
  if (payInit.status === 502) {
    assert('returns error message', typeof payInit.body.error === 'string');
  } else {
    assert('returns access_code', !!payInit.body.data?.accessCode);
  }

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

  // ── Orders — valid ──────────────────────────────────
  console.log('\n▸ Orders — POST valid');
  const o1 = await req('POST', '/api/orders', {
    customerName: 'Ama Boateng', email: 'ama@example.com',
    shippingAddress: '12 Ring Road, Accra',
    cart: [
      { id: 'prod_1', name: 'Shea Butter Cream', price: 45, quantity: 2 },
      { id: 'prod_2', name: 'Coconut Hair Oil',  price: 30, quantity: 1 },
    ],
  });
  assert('POST /api/orders valid → 201',      o1.status === 201);
  assert('message is Order created',          o1.body.message === 'Order created successfully');
  assert('order has id',                      !!o1.body.order?.id);
  assert('customerName correct',              o1.body.order?.customerName === 'Ama Boateng');
  assert('email correct',                     o1.body.order?.email === 'ama@example.com');
  assert('totalAmount = 120 (45x2 + 30x1)',  o1.body.order?.totalAmount === 120);
  assert('status is pending',                 o1.body.order?.status === 'pending');
  assert('items array has 2 items',           o1.body.order?.items?.length === 2);
  assert('item 1 productName correct',        o1.body.order?.items?.[0]?.productName === 'Shea Butter Cream');
  assert('item 1 quantity correct',           o1.body.order?.items?.[0]?.quantity === 2);
  assert('item 1 price correct',              o1.body.order?.items?.[0]?.price === 45);
  assert('createdAt present',                 !!o1.body.order?.createdAt);

  // ── Orders — qty alias (checkout.js sends qty) ──────
  console.log('\n▸ Orders — qty alias (checkout integration)');
  const o2 = await req('POST', '/api/orders', {
    customerName: 'Kofi', shippingAddress: 'Kumasi',
    cart: [{ id: 'p1', name: 'Baby Wrap', price: 60, qty: 3 }],
  });
  assert('POST /api/orders with qty alias → 201',  o2.status === 201);
  assert('qty alias → quantity=3',                  o2.body.order?.items?.[0]?.quantity === 3);
  assert('totalAmount with qty alias = 180',        o2.body.order?.totalAmount === 180);

  // ── Orders — email optional ──────────────────────────
  console.log('\n▸ Orders — email optional');
  const o3 = await req('POST', '/api/orders', {
    customerName: 'Kwame', shippingAddress: 'Takoradi',
    cart: [{ id: 'p2', name: 'Toy Set', price: 50, quantity: 1 }],
  });
  assert('POST /api/orders no email → 201',  o3.status === 201);
  assert('email is null when omitted',        o3.body.order?.email === null);

  // ── Orders — validation failures ────────────────────
  console.log('\n▸ Orders — validation failures');
  const ov1 = await req('POST', '/api/orders', { shippingAddress: 'Accra', cart: [{ id: 'p1', name: 'X', price: 10, quantity: 1 }] });
  assert('missing customerName → 400',    ov1.status === 400);

  const ov2 = await req('POST', '/api/orders', { customerName: 'T', cart: [{ id: 'p1', name: 'X', price: 10, quantity: 1 }] });
  assert('missing shippingAddress → 400', ov2.status === 400);

  const ov3 = await req('POST', '/api/orders', { customerName: 'T', shippingAddress: 'Accra', cart: [] });
  assert('empty cart array → 400',        ov3.status === 400);

  const ov4 = await req('POST', '/api/orders', { customerName: 'T', shippingAddress: 'Accra' });
  assert('no cart field → 400',           ov4.status === 400);

  // ── Products (cart source) ──────────────────────────
  console.log('\n▸ Products');
  const prod = await req('GET', '/api/products');
  assert('GET /api/products → 200',          prod.status === 200);
  assert('products array returned',          Array.isArray(prod.body.products));
  assert('at least 1 product in catalog',    prod.body.products?.length > 0);
  assert('product has id, name, price',      !!(prod.body.products?.[0]?.id && prod.body.products?.[0]?.name));

  const sp = await req('GET', '/api/products/1');
  assert('GET /api/products/1 → 200',        sp.status === 200);
  assert('single product data returned',     !!sp.body.data?.name);

  const sp404 = await req('GET', '/api/products/not-a-real-id');
  assert('GET /api/products/unknown → 404',  sp404.status === 404);

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
