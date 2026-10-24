const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

// Keep this suite independent of account credentials and safe for CI/local runs.
process.env.SUPABASE_URL = "https://unit-test.invalid.supabase.co";
process.env.SUPABASE_ANON_KEY = "unit-test-anon-key";
process.env.SUPABASE_SERVICE_ROLE_KEY = "unit-test-service-role-key";
process.env.RECEIPT_ACCESS_TOKEN_SECRET = "unit-test-receipt-signing-key";
process.env.FRONTEND_ORIGIN = "https://unit-test.invalid";
delete process.env.PAYSTACK_SECRET_KEY;
delete process.env.PAYSTACK_CALLBACK_URL;

const { createServer, checkSupabaseReadiness, validEmail, isValidOptionalEmail, isValidCheckoutContact, createGuestPaystackEmail, getPaystackConfiguration, buildPaystackInitializationPayload, formatPaymentInitializationFailure, formatPaymentVerificationFailure, safePaymentErrorCode, buildPricedItems, canTransitionOrderStatus, isStoredProductImageUrl, describeProductImageStorageError, createReceiptAccessToken, verifyReceiptAccessToken } = require("../src/backend/server");

async function main() {
  console.log("Check email validation");
  assert.equal(validEmail("buyer@example.com"), true);
  assert.equal(validEmail(" buyer+tag@example.co.gh "), true);
  assert.equal(validEmail("buyer@"), false);
  assert.equal(validEmail(""), false);
  assert.equal(isValidOptionalEmail(""), true, "an omitted customer email is accepted");
  assert.equal(isValidOptionalEmail("buyer@example.com"), true, "a provided valid email is accepted");
  assert.equal(isValidOptionalEmail("not-an-email"), false, "a provided malformed email is rejected");
  assert.equal(isValidCheckoutContact("Buyer Example", "", "+233200000000"), true, "name and phone are sufficient checkout contact details");
  assert.equal(isValidCheckoutContact("Buyer Example", "bad-email", "+233200000000"), false, "a provided malformed email blocks checkout");
  assert.equal(isValidCheckoutContact("", "", "+233200000000"), false, "customer name remains required");
  assert.equal(isValidCheckoutContact("Buyer Example", "", ""), false, "phone remains required");
  const guestPaymentEmail = createGuestPaystackEmail("https://shop.example.co.gh/checkout/return");
  const productionOrigin = "https://kayshaven.live";
  const productionCallback = `${productionOrigin}/checkout/checkout.html`;
  assert.match(guestPaymentEmail, /^checkout-[a-f0-9]{32}@shop\.example\.co\.gh$/, "Paystack receives a non-personal alias based on the HTTPS callback domain");
  assert.equal(getPaystackConfiguration("", "https://shop.example.co.gh/checkout/return").configured, false, "missing Paystack secret disables checkout");
  assert.equal(getPaystackConfiguration("sk_live_example", "https://shop.example.co.gh/checkout/return").configured, false, "live Paystack keys are rejected while the integration is restricted to Test Mode");
  assert.equal(getPaystackConfiguration("sk_test_example", "http://localhost/checkout/checkout.html", "https://shop.example.co.gh").configured, false, "non-HTTPS callback disables checkout");
  assert.equal(getPaystackConfiguration("sk_test_example", "https://shop.example.co.gh/checkout/checkout.html", "https://shop.example.co.gh").configured, true, "complete secure Paystack configuration enables checkout");
  assert.equal(getPaystackConfiguration("sk_test_example", productionCallback, productionOrigin).callbackUrl, productionCallback, "the production Paystack callback is the canonical Cloudflare checkout URL");
  assert.equal(getPaystackConfiguration("sk_test_example", "https://radiant-croissant-02f4a0.netlify.app/checkout/checkout.html", productionOrigin).configured, false, "a callback on the retired Netlify origin is rejected");
  assert.equal(getPaystackConfiguration("sk_test_example", "https://kays-haven-staging.pages.dev/checkout/checkout.html", productionOrigin).configured, false, "staging remains an API origin but cannot replace the production payment callback");
  assert.equal(getPaystackConfiguration("sk_test_example", `${productionOrigin}/checkout/return`, productionOrigin).configured, false, "callbacks must use the verified checkout route");
  assert.equal(getPaystackConfiguration("sk_test_example", "", "https://shop.example.co.gh").callbackUrl, "https://shop.example.co.gh/checkout/checkout.html", "an omitted callback derives the checkout URL from the secure frontend origin");
  assert.equal(getPaystackConfiguration("sk_test_example", "", "http://shop.example.co.gh").configured, false, "callback fallback requires an HTTPS frontend origin");
  assert.equal(getPaystackConfiguration("sk_test_example", "", "https://shop.example.co.gh/shop").configured, false, "callback fallback accepts an origin, not a path-bearing URL");
  assert.doesNotMatch(JSON.stringify(getPaystackConfiguration("sk_test_example", "https://shop.example.co.gh/checkout/return")), /sk_test_example/, "payment configuration never returns the secret");

  console.log("Check signed, paid-only customer receipt access");
  const receiptSigningKey = "synthetic-receipt-signing-key-for-tests";
  const receiptIssuedAt = Date.now();
  const receiptToken = createReceiptAccessToken("receipt-order-42", "KH-TEST-REFERENCE-42", receiptSigningKey, receiptIssuedAt);
  assert.equal(Boolean(verifyReceiptAccessToken(receiptToken, "receipt-order-42", receiptSigningKey, receiptIssuedAt)), true, "signed receipt access is valid for its order");
  assert.equal(verifyReceiptAccessToken(receiptToken, "another-order", receiptSigningKey, receiptIssuedAt), null, "a receipt token cannot access another order");
  assert.equal(verifyReceiptAccessToken(receiptToken, "receipt-order-42", "incorrect-signing-key", receiptIssuedAt), null, "receipt access requires the server signing key");
  assert.equal(verifyReceiptAccessToken(receiptToken, "receipt-order-42", receiptSigningKey, receiptIssuedAt + 25 * 60 * 60 * 1000), null, "receipt access expires after its limited lifetime");

  console.log("Check Paystack Test Mode initialization payload and safe diagnostics");
  const paystackPayload = buildPaystackInitializationPayload({
    email: guestPaymentEmail,
    totalAmount: 765.25,
    reference: "KH-1792600000000-a1b2c3d4e5f6",
    callbackUrl: productionCallback,
    orderId: "synthetic-order-id",
    orderNumber: "KH-SYNTHETIC",
    customerName: "Synthetic Buyer"
  });
  assert.equal(typeof paystackPayload.amount, "string", "Paystack receives the amount as a string in the currency subunit");
  assert.equal(paystackPayload.amount, "76525", "GHS is converted to pesewas without changing the server-priced amount");
  assert.equal(paystackPayload.currency, "GHS");
  assert.equal(paystackPayload.email, guestPaymentEmail, "an optional customer email uses the existing non-personal alias");
  assert.match(paystackPayload.reference, /^[A-Za-z0-9.=-]+$/, "payment reference uses Paystack-supported characters");
  assert.equal(paystackPayload.callback_url, productionCallback);
  assert.equal(typeof paystackPayload.metadata, "string", "Paystack receives metadata as a JSON string");
  assert.deepEqual(JSON.parse(paystackPayload.metadata), {
    order_id: "synthetic-order-id",
    order_number: "KH-SYNTHETIC",
    customer_name: "Synthetic Buyer"
  });

  const sensitiveProviderError = Object.assign(new Error("buyer@example.com +233 20 000 0000 sk_test_do_not_log Bearer private-token https://checkout.paystack.com/private"), { code: "PAYSTACK_HTTP_401" });
  const providerFailureLog = formatPaymentInitializationFailure("paystack_initialize", sensitiveProviderError);
  assert.deepEqual(providerFailureLog, {
    event: "payment_initialization_failed",
    stage: "paystack_initialize",
    code: "PAYSTACK_HTTP_401",
    message: "Paystack transaction initialization failed."
  }, "diagnostics include only stage, safe code, and fixed safe message");
  assert.doesNotMatch(JSON.stringify(providerFailureLog), /buyer@example|\+233|sk_test|Bearer|checkout\.paystack\.com|private-token/i, "payment diagnostics never serialize customer data, credentials, or authorization URLs");
  assert.equal(safePaymentErrorCode({ code: "PGRST204", message: "schema cache error" }), "PGRST204", "Supabase/PostgREST error codes remain useful to operators");
  assert.equal(safePaymentErrorCode({ code: "customer@example.com", message: "sensitive" }), "UNCLASSIFIED", "untrusted error codes are not logged");
  assert.equal(formatPaymentInitializationFailure("order_item_insert", { code: "23503", message: "details omitted" }).stage, "order_item_insert", "order-item failures are reported at their own stage");
  const verificationFailureLog = formatPaymentVerificationFailure("finalize_order", sensitiveProviderError);
  assert.deepEqual(verificationFailureLog, {
    event: "payment_verification_failed",
    stage: "finalize_order",
    code: "PAYSTACK_HTTP_401",
    message: "The verified payment could not be finalized."
  }, "verification diagnostics identify the failure stage and safe provider/database code");
  assert.doesNotMatch(JSON.stringify(verificationFailureLog), /buyer@example|\+233|sk_test|Bearer|checkout\.paystack\.com|private-token/i, "verification diagnostics omit customer details, credentials, and URLs");

  console.log("Check server prices, sizes, and product visibility");
  const projectOrigin = new URL(process.env.SUPABASE_URL).origin;
  const uploadedImageUrl = `${projectOrigin}/storage/v1/object/public/kays-haven-products/9efc40bb-1145-4e62-84b4-3e6776ec5c2e.webp`;
  assert.equal(isStoredProductImageUrl(uploadedImageUrl), true, "published product images must use the configured public storage bucket");
  assert.equal(isStoredProductImageUrl("https://attacker.example/storage/v1/object/public/kays-haven-products/9efc40bb-1145-4e62-84b4-3e6776ec5c2e.webp"), false, "external image URLs are rejected for product writes");
  assert.equal(isStoredProductImageUrl(`${projectOrigin}/storage/v1/object/public/kays-haven-products/local-image.png`), false, "local paths are not accepted as newly published images");
  const missingImageBucket = describeProductImageStorageError({ statusCode: "404", message: "Bucket not found" });
  assert.equal(missingImageBucket.code, "PRODUCT_IMAGE_BUCKET_MISSING");
  assert.match(missingImageBucket.error, /202610120001_product_image_storage\.sql/);
  const deniedImageUpload = describeProductImageStorageError({ statusCode: "403", message: "new row violates row-level security policy" });
  assert.equal(deniedImageUpload.code, "PRODUCT_IMAGE_STORAGE_ACCESS_DENIED");
  assert.doesNotMatch(deniedImageUpload.error, /service.role.key|eyJ/i, "storage errors do not expose credentials");
  const unknownImageFailure = describeProductImageStorageError({ message: "network error" });
  assert.equal(unknownImageFailure.code, "PRODUCT_IMAGE_UPLOAD_FAILED");
  const products = [
    { id: 4, name: "Cotton top", price: 25.5, stock: 5, sizes: ["S", "M"] },
    { id: 5, name: "Toy", category: "Toys", price: 10, stock: 4, sizes: [] },
    { id: 6, name: "Mermaid Tutu Dress", category: "Kids", price: 35, stock: 3, sizes: [] }
  ];
  const result = buildPricedItems([
    { product_id: 4, quantity: 2, size: "M", price: 0.01 },
    { product_id: 5, quantity: 1 }
  ], products);
  assert.equal(result.total, 61, "new checkout totals contain only catalogue-priced items");
  assert.equal(result.items[0].price, 25.5);
  assert.equal(result.items[0].size, "M");
  assert.throws(() => buildPricedItems([{ id: 6, quantity: 1 }], [{ id: 6, name: "Unpriced product", price: 0, stock: 1 }]), /invalid price/i);
  const inferredSize = buildPricedItems([{ id: 6, quantity: 1, size: "XL" }], products);
  assert.equal(inferredSize.items[0].size, "XL", "standard clothing size selections are stored in order items even if legacy catalogue sizes are empty");
  const zeroStockPurchase = buildPricedItems([
    { id: 4, quantity: 20, size: "M" },
    { id: 4, quantity: 30, size: "S" }
  ], [{ ...products[0], stock: 0 }]);
  assert.equal(zeroStockPurchase.total, 1275, "a stale zero stock count does not block purchase or Paystack total calculation");
  assert.throws(() => buildPricedItems([{ id: 6, quantity: 1 }], products), /size/i, "apparel requires a selected size");
  assert.throws(() => buildPricedItems([{ id: 5, quantity: 1, size: "M" }], products), /does not have size options/i, "toys remain unsized");
  assert.throws(() => buildPricedItems([{ id: 7, quantity: 1 }], [{ id: 7, name: "Hidden product", price: 10, stock: 5, sizes: [], is_active: false }]), /no longer available/i, "inactive products cannot be purchased");

  console.log("Check selectable fulfillment transitions");
  for (const [current, payment] of [["Pending", "paid"], ["Paid", "paid"], ["Processing", "paid"], ["Completed", "paid"]]) {
    assert.equal(canTransitionOrderStatus(current, payment, "Completed"), true, `${current}/${payment} can be explicitly marked completed`);
  }
  for (const [current, payment] of [["Pending", "pending"], ["Pending", "unpaid"], ["Pending", "failed"], ["Processing", "unpaid"], ["Legacy status", "unknown"]]) {
    assert.equal(canTransitionOrderStatus(current, payment, "Completed"), false, `${current}/${payment} cannot be completed before verified payment`);
  }
  for (const [current, payment] of [["Pending", "pending"], ["Pending", "failed"], ["Processing", "unpaid"], ["Legacy status", "unknown"]]) {
    assert.equal(canTransitionOrderStatus(current, payment, "Canceled"), true, `${current}/${payment} can be explicitly canceled`);
  }
  for (const unsupported of ["Processing", "Cancelled", "Pending", "Paid", "completed", "canceled"]) {
    assert.equal(canTransitionOrderStatus("Pending", "pending", unsupported), false, `${unsupported} is not a selectable fulfillment status`);
  }

  console.log("Check required sizes with stale inventory counts");
  const sizedProducts = [{ id: "shirt", name: "Shirt", price: 20, stock: 0, sizes: ["4Y", "6Y"] }];
  assert.throws(() => buildPricedItems([{ id: "shirt", quantity: 1 }], sizedProducts), /size/i);
  const zeroStockSizedOrder = buildPricedItems([
    { id: "shirt", quantity: 2, size: "4Y" },
    { id: "shirt", quantity: 1, size: "6Y" }
  ], sizedProducts);
  assert.equal(zeroStockSizedOrder.total, 60, "aggregate purchases remain valid even when the legacy stock field is zero");

  console.log("Check backend health endpoint");
  const server = createServer();
  try {
    await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
    const baseUrl = `http://127.0.0.1:${server.address().port}`;
    const response = await fetch(`${baseUrl}/api/health`);
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { success: true, message: "Backend is running" });
    for (const path of ["/api/health/", "/api/health?probe=render"]) {
      const normalizedHealth = await fetch(`${baseUrl}${path}`);
      assert.equal(normalizedHealth.status, 200, `${path} is accepted as a health check`);
      assert.deepEqual(await normalizedHealth.json(), { success: true, message: "Backend is running" });
    }

    console.log("Check CORS allows only explicitly configured storefront origins");
    const temporaryPagesOrigin = "https://kays-haven-staging.pages.dev";
    const productionOrigin = "https://kayshaven.live";
    const corsServer = createServer({ frontendOrigins: `${productionOrigin}, ${temporaryPagesOrigin}` });
    try {
      await new Promise(resolve => corsServer.listen(0, "127.0.0.1", resolve));
      const corsUrl = `http://127.0.0.1:${corsServer.address().port}`;
      for (const allowedOrigin of [productionOrigin, temporaryPagesOrigin]) {
        const allowedOriginResponse = await fetch(`${corsUrl}/api/health`, {
          headers: { Origin: allowedOrigin }
        });
        assert.equal(allowedOriginResponse.status, 200, `${allowedOrigin} can call the API`);
        assert.equal(allowedOriginResponse.headers.get("access-control-allow-origin"), allowedOrigin);
        assert.match(allowedOriginResponse.headers.get("vary") || "", /origin/i);

        const allowedPreflight = await fetch(`${corsUrl}/api/payments/initialize`, {
          method: "OPTIONS",
          headers: {
            Origin: allowedOrigin,
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "authorization,content-type"
          }
        });
        assert.equal(allowedPreflight.status, 204, `${allowedOrigin} can preflight API calls`);
        assert.equal(allowedPreflight.headers.get("access-control-allow-origin"), allowedOrigin);
        assert.equal(allowedPreflight.headers.get("access-control-allow-methods"), "GET, POST, PATCH, DELETE, OPTIONS");
        assert.equal(allowedPreflight.headers.get("access-control-allow-headers"), "Content-Type, Authorization");
      }

      const rejectedOrigin = await fetch(`${corsUrl}/api/health`, {
        headers: { Origin: "https://other-project.pages.dev" }
      });
      assert.equal(rejectedOrigin.status, 403);
      assert.equal(rejectedOrigin.headers.get("access-control-allow-origin"), null);

      const rejectedPreflight = await fetch(`${corsUrl}/api/payments/initialize`, {
        method: "OPTIONS",
        headers: { Origin: "https://other-project.pages.dev", "Access-Control-Request-Method": "POST" }
      });
      assert.equal(rejectedPreflight.status, 403);
      assert.equal(rejectedPreflight.headers.get("access-control-allow-origin"), null);

      const wildcardOrigin = await fetch(`${corsUrl}/api/health`, {
        headers: { Origin: "https://anything.pages.dev" }
      });
      assert.equal(wildcardOrigin.status, 403, "a Pages wildcard is never allowed");
      assert.equal(wildcardOrigin.headers.get("access-control-allow-origin"), null);

      const legacyServer = createServer({ frontendOrigin: temporaryPagesOrigin });
      try {
        await new Promise(resolve => legacyServer.listen(0, "127.0.0.1", resolve));
        const legacyUrl = `http://127.0.0.1:${legacyServer.address().port}`;
        const legacyOrigin = await fetch(`${legacyUrl}/api/health`, {
          headers: { Origin: temporaryPagesOrigin }
        });
        assert.equal(legacyOrigin.status, 200, "the original single-origin configuration remains supported");
        assert.equal(legacyOrigin.headers.get("access-control-allow-origin"), temporaryPagesOrigin);
      } finally {
        await new Promise((resolve, reject) => legacyServer.close(error => error ? reject(error) : resolve()));
      }
    } finally {
      await new Promise((resolve, reject) => corsServer.close(error => error ? reject(error) : resolve()));
    }

    console.log("Check Supabase readiness without exposing database errors");
    const readinessClient = result => ({
      from(table) {
        assert.equal(table, "products", "readiness performs a read-only products probe");
        return {
          select(columns) {
            assert.equal(columns, "id", "readiness selects only a minimal identifier");
            return { limit: async count => {
              assert.equal(count, 1, "readiness limits the probe to one record");
              return result;
            } };
          }
        };
      }
    });
    assert.equal(await checkSupabaseReadiness(readinessClient({ data: [], error: null })), true);
    assert.equal(await checkSupabaseReadiness(readinessClient({ data: null, error: { message: "private database detail" } })), false);
    assert.equal(await checkSupabaseReadiness({ from() { throw new Error("private connection detail"); } }), false);
    const readyServer = createServer({ healthClient: readinessClient({ data: [], error: null }) });
    try {
      await new Promise(resolve => readyServer.listen(0, "127.0.0.1", resolve));
      const readinessResponse = await fetch(`http://127.0.0.1:${readyServer.address().port}/api/health/database`);
      assert.equal(readinessResponse.status, 200);
      assert.deepEqual(await readinessResponse.json(), { success: true, database: "connected" });
    } finally {
      await new Promise((resolve, reject) => readyServer.close(error => error ? reject(error) : resolve()));
    }
    const unavailableServer = createServer({ healthClient: readinessClient({ data: null, error: { message: "private database detail" } }) });
    try {
      await new Promise(resolve => unavailableServer.listen(0, "127.0.0.1", resolve));
      const readinessResponse = await fetch(`http://127.0.0.1:${unavailableServer.address().port}/api/health/database`);
      assert.equal(readinessResponse.status, 503);
      const readinessBody = await readinessResponse.json();
      assert.deepEqual(readinessBody, { success: false, database: "unavailable" });
      assert.doesNotMatch(JSON.stringify(readinessBody), /private database detail/);
    } finally {
      await new Promise((resolve, reject) => unavailableServer.close(error => error ? reject(error) : resolve()));
    }
    const removedDeliveryConfig = await fetch(`${baseUrl}/api/checkout/config`);
    assert.equal(removedDeliveryConfig.status, 404, "checkout no longer exposes delivery-fee configuration");

    const previousPaystackKey = process.env.PAYSTACK_SECRET_KEY;
    const previousCallbackUrl = process.env.PAYSTACK_CALLBACK_URL;
    delete process.env.PAYSTACK_SECRET_KEY;
    delete process.env.PAYSTACK_CALLBACK_URL;
    try {
      const unconfiguredPayment = await fetch(`${baseUrl}/api/payments/initialize`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer_name: "Synthetic Configuration Test",
          email: "",
          phone: "+233000000000",
          expected_total: 1,
          items: [{ product_id: "__PAYSTACK_CONFIG_TEST__", quantity: 1 }]
        })
      });
      assert.equal(unconfiguredPayment.status, 503, "missing Paystack configuration is rejected before checkout database work");
      const unconfiguredBody = await unconfiguredPayment.json();
      assert.match(unconfiguredBody.error, /temporarily unavailable/i);
      assert.doesNotMatch(JSON.stringify(unconfiguredBody), /secret|sk_(?:test|live)_/i, "configuration errors do not expose credentials");
    } finally {
      if (previousPaystackKey === undefined) delete process.env.PAYSTACK_SECRET_KEY;
      else process.env.PAYSTACK_SECRET_KEY = previousPaystackKey;
      if (previousCallbackUrl === undefined) delete process.env.PAYSTACK_CALLBACK_URL;
      else process.env.PAYSTACK_CALLBACK_URL = previousCallbackUrl;
    }

    console.log("Check payment initialization sends the production callback without returning secrets");
    const previousInitKey = process.env.PAYSTACK_SECRET_KEY;
    const previousInitCallback = process.env.PAYSTACK_CALLBACK_URL;
    const previousInitOrigin = process.env.FRONTEND_ORIGIN;
    process.env.PAYSTACK_SECRET_KEY = "sk_test_synthetic_only";
    process.env.PAYSTACK_CALLBACK_URL = productionCallback;
    process.env.FRONTEND_ORIGIN = productionOrigin;
    let initializationPayload;
    const initializationClient = {
      from(table) {
        if (table === "products") {
          return { select: () => ({ in: async (field, values) => {
            assert.equal(field, "id");
            assert.deepEqual(values, ["synthetic-toy"]);
            return { data: [{ id: "synthetic-toy", name: "Synthetic toy", category: "Toys", price: 42.5, sizes: [], is_active: true, image: "images/synthetic-toy.webp" }], error: null };
          } }) };
        }
        if (table === "orders") {
          return { insert: rows => {
            assert.equal(rows[0].payment_status, "pending");
            return { select: () => ({ single: async () => ({ data: { id: "synthetic-payment-order", order_number: "KH-SYNTHETIC-PAYMENT" }, error: null }) }) };
          } };
        }
        if (table === "order_items") return { insert: async rows => { initializationOrderItems = rows; return { error: null, rows }; } };
        throw new Error(`Unexpected payment table ${table}`);
      }
    };
    let initializationOrderItems = [];
    const initializationServer = createServer({
      paymentClient: initializationClient,
      frontendOrigins: productionOrigin,
      paymentRequest: async (endpoint, payload) => {
        assert.equal(endpoint, "/transaction/initialize");
        initializationPayload = payload;
        return { authorization_url: "https://checkout.paystack.com/synthetic-test-authorization" };
      }
    });
    try {
      await new Promise(resolve => initializationServer.listen(0, "127.0.0.1", resolve));
      const initializationResponse = await fetch(`http://127.0.0.1:${initializationServer.address().port}/api/payments/initialize`, {
        method: "POST", headers: { "Content-Type": "application/json", Origin: productionOrigin },
        body: JSON.stringify({
          customer_name: "Synthetic Callback Buyer",
          email: "buyer@example.test",
          phone: "+233000000042",
          expected_total: 42.5,
          items: [{ product_id: "synthetic-toy", quantity: 1, image_url: `${productionOrigin}/product-images/synthetic-toy.webp` }]
        })
      });
      assert.equal(initializationResponse.status, 200);
      const initializationBody = await initializationResponse.json();
      assert.equal(initializationPayload.callback_url, productionCallback, "Paystack initialization uses the exact Cloudflare production callback");
      assert.equal(initializationOrderItems[0].product_image_url, `${productionOrigin}/product-images/synthetic-toy.webp`, "checkout saves a safe item image snapshot beside authoritative name, size, quantity, and price");
      assert.equal(initializationBody.authorization_url, "https://checkout.paystack.com/synthetic-test-authorization");
      assert.ok(initializationBody.reference);
      assert.deepEqual(Object.keys(initializationBody).sort(), ["authorization_url", "reference"], "the customer response contains no callback configuration or provider secret");
      assert.doesNotMatch(JSON.stringify(initializationBody), /sk_test_synthetic_only|secret/i, "the Test Mode secret is never returned to the browser");
    } finally {
      await new Promise((resolve, reject) => initializationServer.close(error => error ? reject(error) : resolve()));
      if (previousInitKey === undefined) delete process.env.PAYSTACK_SECRET_KEY;
      else process.env.PAYSTACK_SECRET_KEY = previousInitKey;
      if (previousInitCallback === undefined) delete process.env.PAYSTACK_CALLBACK_URL;
      else process.env.PAYSTACK_CALLBACK_URL = previousInitCallback;
      if (previousInitOrigin === undefined) delete process.env.FRONTEND_ORIGIN;
      else process.env.FRONTEND_ORIGIN = previousInitOrigin;
    }

    console.log("Check payment verification rejects failed and mismatched transactions");
    const verificationOrder = {
      id: "synthetic-payment-order",
      order_number: "KH-SYNTHETIC-PAYMENT",
      customer_name: "Synthetic Buyer",
      total_amount: 42.5,
      payment_reference: "KH-VERIFY-REFERENCE-42",
      payment_status: "pending"
    };
    let providerPayment = {};
    let providerVerificationCount = 0;
    const finalizedReferences = [];
    const paymentClient = {
      from(table) {
        assert.equal(table, "orders");
        return {
          select(columns) {
            assert.match(columns, /payment_status/);
            return {
              eq(field, value) {
                assert.equal(field, "payment_reference");
                assert.equal(value, "KH-VERIFY-REFERENCE-42");
                return { single: async () => ({ data: { ...verificationOrder }, error: null }) };
              }
            };
          }
        };
      },
      async rpc(name, args) {
        assert.equal(name, "finalize_paid_order");
        finalizedReferences.push(args.p_reference);
        verificationOrder.payment_status = "paid";
        return { error: null };
      }
    };
    const verificationServer = createServer({
      paymentClient,
      paymentRequest: async endpoint => {
        providerVerificationCount += 1;
        assert.equal(endpoint, "/transaction/verify/KH-VERIFY-REFERENCE-42");
        return providerPayment;
      },
      receiptSigningKey: "synthetic-payment-signing-key"
    });
    try {
      await new Promise(resolve => verificationServer.listen(0, "127.0.0.1", resolve));
      const verificationUrl = `http://127.0.0.1:${verificationServer.address().port}/api/payments/verify`;
      const invalidPayments = [
        { reference: "KH-VERIFY-REFERENCE-42", status: "failed", currency: "GHS", amount: 4250 },
        { reference: "KH-VERIFY-REFERENCE-42", status: "abandoned", currency: "GHS", amount: 4250 },
        { reference: "KH-OTHER-REFERENCE", status: "success", currency: "GHS", amount: 4250 },
        { reference: "KH-VERIFY-REFERENCE-42", status: "success", currency: "USD", amount: 4250 },
        { reference: "KH-VERIFY-REFERENCE-42", status: "success", currency: "GHS", amount: 4249 },
        { reference: "KH-VERIFY-REFERENCE-42", status: "pending", currency: "GHS", amount: 4250 }
      ];
      for (const invalidPayment of invalidPayments) {
        verificationOrder.payment_status = "pending";
        providerPayment = invalidPayment;
        const response = await fetch(verificationUrl, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reference: "KH-VERIFY-REFERENCE-42" })
        });
        assert.equal(response.status, 409, `${invalidPayment.status}/${invalidPayment.currency}/${invalidPayment.amount} is not confirmed`);
        const body = await response.json();
        assert.notEqual(body.success, true, "failed, canceled, pending, or mismatched transactions never receive a paid response");
        assert.equal(finalizedReferences.length, 0, "unverified payments never finalize the order");
      }

      providerPayment = { reference: "KH-VERIFY-REFERENCE-42", status: "success", currency: "GHS", amount: 4250 };
      const verifiedResponse = await fetch(verificationUrl, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reference: "KH-VERIFY-REFERENCE-42" })
      });
      assert.equal(verifiedResponse.status, 200);
      const verifiedBody = await verifiedResponse.json();
      assert.equal(verifiedBody.success, true);
      assert.equal(verifiedBody.payment_status, "paid");
      assert.deepEqual(finalizedReferences, ["KH-VERIFY-REFERENCE-42"], "only a verified exact amount, currency, and reference are finalized");

      const verificationCountAfterSuccess = providerVerificationCount;
      const duplicateCallback = await fetch(verificationUrl, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reference: "KH-VERIFY-REFERENCE-42" })
      });
      assert.equal(duplicateCallback.status, 200, "a retry of an already verified callback remains idempotent");
      assert.equal(providerVerificationCount, verificationCountAfterSuccess, "an already-paid order is not initialized or finalized again");
      assert.deepEqual(finalizedReferences, ["KH-VERIFY-REFERENCE-42"]);
    } finally {
      await new Promise((resolve, reject) => verificationServer.close(error => error ? reject(error) : resolve()));
    }

    const badPaymentRequest = await fetch(`${baseUrl}/api/payments/initialize`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({})
    });
    assert.equal(badPaymentRequest.status, 400, "payment initialization validates customer details before creating an order");
    const missingReference = await fetch(`${baseUrl}/api/payments/verify`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({})
    });
    assert.equal(missingReference.status, 400, "payment verification requires a reference");
    const unauthorisedProductEdit = await fetch(`${baseUrl}/api/products/1`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ stock: 100 })
    });
    assert.equal(unauthorisedProductEdit.status, 401, "inventory changes require staff authentication");
    const unauthorisedProductDelete = await fetch(`${baseUrl}/api/products/1`, { method: "DELETE" });
    assert.equal(unauthorisedProductDelete.status, 401, "permanent product deletion requires staff authentication");
    const unauthorisedHiddenInventory = await fetch(`${baseUrl}/api/products?include_inactive=true`);
    assert.equal(unauthorisedHiddenInventory.status, 401, "inactive inventory is staff-only");
    const unauthorisedProductCreate = await fetch(`${baseUrl}/api/products`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: "Test", category: "Baby", price: 1, stock: 1 })
    });
    assert.equal(unauthorisedProductCreate.status, 401, "product creation requires staff authentication");
    const unauthorisedImageUpload = await fetch(`${baseUrl}/api/products/images`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ data_url: "data:image/png;base64,AA==" })
    });
    assert.equal(unauthorisedImageUpload.status, 401, "product image uploads require staff authentication");
    const unauthorisedOrderEdit = await fetch(`${baseUrl}/api/orders/1/status`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: "Processing" })
    });
    assert.equal(unauthorisedOrderEdit.status, 401, "order changes require staff authentication");
    const unverifiedOrderCreation = await fetch(`${baseUrl}/api/orders`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ total_amount: 1, items: [{}] })
    });
    assert.equal(unverifiedOrderCreation.status, 410, "orders cannot be created through the legacy unverified endpoint");
  } finally {
    await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  }

  let receiptRecord = {
    data: {
      id: "receipt-order-42",
      order_number: "KH-RECEIPT-42",
      customer_name: "Synthetic Buyer",
      email: "private@example.test",
      phone: "+233000000042",
      created_at: "2026-10-22T12:00:00.000Z",
      total_amount: 42.5,
      payment_status: "paid",
      payment_method: "Paystack",
      payment_reference: "KH-TEST-REFERENCE-42",
      order_items: [
        { product_name: "Cotton top", product_image_url: "https://kayshaven.live/product-images/cotton-top.png", size: "M", quantity: 2, price: 20 },
        { product_name: "Toy", product_image_url: null, size: null, quantity: 1, price: 2.5 }
      ]
    },
    error: null
  };
  let receiptReadCount = 0;
  const receiptClient = {
    from(table) {
      assert.equal(table, "orders", "receipt lookup reads the existing orders record");
      return {
        select(columns) {
          assert.match(columns, /order_items/);
          assert.match(columns, /email/);
          assert.match(columns, /phone/);
          assert.match(columns, /product_image_url/, "receipt reads the immutable image stored on each order item");
          return {
            eq(field, id) {
              assert.equal(field, "id");
              assert.equal(id, "receipt-order-42");
              return { async single() { receiptReadCount += 1; return receiptRecord; } };
            }
          };
        }
      };
    }
  };
  const receiptServer = createServer({ receiptClient, receiptSigningKey });
  try {
    await new Promise(resolve => receiptServer.listen(0, "127.0.0.1", resolve));
    const receiptUrl = `http://127.0.0.1:${receiptServer.address().port}/api/receipts/receipt-order-42`;
    const noAccess = await fetch(receiptUrl);
    assert.equal(noAccess.status, 401, "guessing the order ID alone cannot access its receipt");
    assert.equal(receiptReadCount, 0, "unauthorized receipt requests do not query order data");

    const accessToken = createReceiptAccessToken("receipt-order-42", "KH-TEST-REFERENCE-42", receiptSigningKey);
    const successfulReceipt = await fetch(receiptUrl, { headers: { Authorization: `Bearer ${accessToken}` } });
    assert.equal(successfulReceipt.status, 200, "a signed token can access a verified paid receipt");
    assert.equal(successfulReceipt.headers.get("cache-control"), "private, no-store", "customer receipt data is not cached by shared intermediaries");
    const successfulReceiptBody = await successfulReceipt.json();
    assert.deepEqual(successfulReceiptBody.receipt, {
      verified: true,
      order_number: "KH-RECEIPT-42",
      purchase_date: "2026-10-22T12:00:00.000Z",
      customer_name: "Synthetic Buyer",
      email: "private@example.test",
      phone: "+233000000042",
      items: [
        { product_name: "Cotton top", image_url: "https://kayshaven.live/product-images/cotton-top.png", size: "M", quantity: 2, unit_price: 20, line_total: 40 },
        { product_name: "Toy", image_url: "", size: "N/A", quantity: 1, unit_price: 2.5, line_total: 2.5 }
      ],
      subtotal: 42.5,
      total_amount: 42.5,
      payment_status: "VERIFIED PAID",
      payment_method: "Paystack",
      payment_reference: "KH-TEST-REFERENCE-42"
    });
    assert.match(JSON.stringify(successfulReceiptBody), /private@example/);
    assert.match(JSON.stringify(successfulReceiptBody), /\+233000000042/);

    receiptRecord = { data: null, error: { code: "PGRST116" } };
    const missingToken = createReceiptAccessToken("receipt-order-42", "KH-TEST-REFERENCE-42", receiptSigningKey);
    const missingReceipt = await fetch(receiptUrl, { headers: { Authorization: `Bearer ${missingToken}` } });
    assert.equal(missingReceipt.status, 404, "a receipt for a missing order returns not found");

    receiptRecord = {
      data: {
        ...successfulReceiptBody.receipt,
        id: "receipt-order-42",
        payment_status: "failed",
        payment_reference: "KH-TEST-REFERENCE-42",
        order_items: [{ product_name: "Cotton top", product_image_url: null, size: "M", quantity: 2, price: 20 }]
      },
      error: null
    };
    const failedPaymentToken = createReceiptAccessToken("receipt-order-42", "KH-TEST-REFERENCE-42", receiptSigningKey);
    const failedPaymentReceipt = await fetch(receiptUrl, { headers: { Authorization: `Bearer ${failedPaymentToken}` } });
    assert.equal(failedPaymentReceipt.status, 409, "failed payments cannot receive a paid receipt");
    assert.match((await failedPaymentReceipt.json()).error, /only after payment is verified/i);
  } finally {
    await new Promise((resolve, reject) => receiptServer.close(error => error ? reject(error) : resolve()));
  }

  console.log("Check public catalogue caching excludes private and inventory fields");
  let publicProductColumns = "";
  const catalogueClient = {
    from(table) {
      assert.equal(table, "products");
      return {
        select(columns) {
          publicProductColumns = columns;
          const query = {
            is(field, value) { assert.equal(field, "deleted_at"); assert.equal(value, null); return this; },
            order(column) { assert.equal(column, "id"); return this; },
            eq(field, value) { assert.equal(field, "is_active"); assert.equal(value, true); return this; },
            async range(start, end) {
              assert.equal(start, 0); assert.equal(end, 499);
              return { data: [{ id: 1, name: "Synthetic product", category: "Toys", price: 12.5, image: "product-images/4-seba-med-cleansing-bar.png", description: "A public product", sizes: [] }, { id: 2, image: null }], error: null };
            }
          };
          return query;
        }
      };
    }
  };
  const publicCatalogueServer = createServer({ catalogueClient, frontendOrigins: productionOrigin });
  try {
    await new Promise(resolve => publicCatalogueServer.listen(0, "127.0.0.1", resolve));
    const publicResponse = await fetch(`http://127.0.0.1:${publicCatalogueServer.address().port}/api/products`, { headers: { Origin: productionOrigin } });
    assert.equal(publicResponse.status, 200);
    assert.equal(publicResponse.headers.get("cache-control"), "public, max-age=15, stale-while-revalidate=30");
    assert.equal(publicResponse.headers.get("vary"), "Origin");
    assert.match(publicProductColumns, /id, name, category, price, image, description, sizes/);
    assert.doesNotMatch(publicProductColumns, /stock|email|phone|is_active/);
    assert.deepEqual(await publicResponse.json(), { products: [{ id: 1, name: "Synthetic product", category: "Toys", price: 12.5, image: "product-images/4-seba-med-cleansing-bar.png", description: "A public product", sizes: [] }] });
  } finally {
    await new Promise((resolve, reject) => publicCatalogueServer.close(error => error ? reject(error) : resolve()));
  }

  console.log("Check catalogue pagination past Supabase row limits and failure recovery");
  let paginationFailure = false;
  let pageRequests = [];
  const pagedCatalogue = { from() { return { select() { return this; }, is() { return this; }, order() { return this; }, eq() { return this; },
    async range(start, end) {
      pageRequests.push([start, end]);
      if (paginationFailure && start === 500) return { error: { message: "synthetic database failure" } };
      return { data: Array.from({ length: start === 0 ? 500 : 2 }, (_, i) => ({ id: 1000 + start + i, name: `Toy ${start+i}`, price: 10, image: "images/4-seba-med-cleansing-bar.png" })) };
    }
  }; } };
  const pagedServer = createServer({ catalogueClient: pagedCatalogue, frontendOrigins: productionOrigin });
  try {
    await new Promise(resolve => pagedServer.listen(0, "127.0.0.1", resolve));
    const endpoint = `http://127.0.0.1:${pagedServer.address().port}/api/products`;
    const complete = await fetch(endpoint);
    const body = await complete.json();
    assert.equal(body.products.length, 502);
    assert.equal(new Set(body.products.map(p => p.id)).size, 502);
    assert.deepEqual(pageRequests, [[0,499],[500,999]]);
    paginationFailure = true;
    const failed = await fetch(endpoint);
    assert.equal(failed.status, 500, "an incomplete catalogue must not be returned as success");
    assert.equal((await failed.json()).products, undefined);
  } finally { await new Promise(resolve => pagedServer.close(resolve)); }

  const receiptImageMigration = fs.readFileSync(path.join(__dirname, "..", "supabase", "migrations", "202610230001_order_item_receipt_image_snapshot.sql"), "utf8");
  assert.match(receiptImageMigration, /add column if not exists product_image_url text/i);
  assert.doesNotMatch(receiptImageMigration, /update\s+public\.order_items/i, "legacy order snapshots are not silently overwritten with today's catalogue images");
  console.log("All backend checks passed");
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
