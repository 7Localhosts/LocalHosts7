const assert = require("node:assert/strict");

// Keep this suite independent of account credentials and safe for CI/local runs.
process.env.SUPABASE_URL = "https://unit-test.invalid.supabase.co";
process.env.SUPABASE_ANON_KEY = "unit-test-anon-key";
process.env.SUPABASE_SERVICE_ROLE_KEY = "unit-test-service-role-key";
process.env.RECEIPT_ACCESS_TOKEN_SECRET = "unit-test-receipt-signing-key";
process.env.FRONTEND_ORIGIN = "https://unit-test.invalid";
delete process.env.PAYSTACK_SECRET_KEY;
delete process.env.PAYSTACK_CALLBACK_URL;

const { createServer, checkSupabaseReadiness, validEmail, isValidOptionalEmail, isValidCheckoutContact, createGuestPaystackEmail, getPaystackConfiguration, buildPaystackInitializationPayload, formatPaymentInitializationFailure, safePaymentErrorCode, buildPricedItems, canTransitionOrderStatus, isStoredProductImageUrl, describeProductImageStorageError, createReceiptAccessToken, verifyReceiptAccessToken } = require("../src/backend/server");

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
  assert.match(guestPaymentEmail, /^checkout-[a-f0-9]{32}@shop\.example\.co\.gh$/, "Paystack receives a non-personal alias based on the HTTPS callback domain");
  assert.equal(getPaystackConfiguration("", "https://shop.example.co.gh/checkout/return").configured, false, "missing Paystack secret disables checkout");
  assert.equal(getPaystackConfiguration("sk_live_example", "https://shop.example.co.gh/checkout/return").configured, false, "live Paystack keys are rejected while the integration is restricted to Test Mode");
  assert.equal(getPaystackConfiguration("sk_test_example", "http://localhost/return").configured, false, "non-HTTPS callback disables checkout");
  assert.equal(getPaystackConfiguration("sk_test_example", "https://shop.example.co.gh/checkout/return").configured, true, "complete secure Paystack configuration enables checkout");
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
    callbackUrl: "https://shop.example.co.gh/checkout/checkout.html",
    orderId: "synthetic-order-id",
    orderNumber: "KH-SYNTHETIC",
    customerName: "Synthetic Buyer"
  });
  assert.equal(typeof paystackPayload.amount, "string", "Paystack receives the amount as a string in the currency subunit");
  assert.equal(paystackPayload.amount, "76525", "GHS is converted to pesewas without changing the server-priced amount");
  assert.equal(paystackPayload.currency, "GHS");
  assert.equal(paystackPayload.email, guestPaymentEmail, "an optional customer email uses the existing non-personal alias");
  assert.match(paystackPayload.reference, /^[A-Za-z0-9.=-]+$/, "payment reference uses Paystack-supported characters");
  assert.equal(paystackPayload.callback_url, "https://shop.example.co.gh/checkout/checkout.html");
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

    console.log("Check CORS allows only the configured storefront origin");
    const temporaryPagesOrigin = "https://kays-haven-temp.pages.dev";
    const corsServer = createServer({ frontendOrigin: temporaryPagesOrigin });
    try {
      await new Promise(resolve => corsServer.listen(0, "127.0.0.1", resolve));
      const corsUrl = `http://127.0.0.1:${corsServer.address().port}`;
      const allowedOriginResponse = await fetch(`${corsUrl}/api/health`, {
        headers: { Origin: temporaryPagesOrigin }
      });
      assert.equal(allowedOriginResponse.status, 200);
      assert.equal(allowedOriginResponse.headers.get("access-control-allow-origin"), temporaryPagesOrigin);
      assert.match(allowedOriginResponse.headers.get("vary") || "", /origin/i);

      const allowedPreflight = await fetch(`${corsUrl}/api/payments/initialize`, {
        method: "OPTIONS",
        headers: {
          Origin: temporaryPagesOrigin,
          "Access-Control-Request-Method": "POST",
          "Access-Control-Request-Headers": "authorization,content-type"
        }
      });
      assert.equal(allowedPreflight.status, 204);
      assert.equal(allowedPreflight.headers.get("access-control-allow-origin"), temporaryPagesOrigin);
      assert.equal(allowedPreflight.headers.get("access-control-allow-methods"), "GET, POST, PATCH, DELETE, OPTIONS");
      assert.equal(allowedPreflight.headers.get("access-control-allow-headers"), "Content-Type, Authorization");

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
        { product_name: "Cotton top", size: "M", quantity: 2, price: 20 },
        { product_name: "Toy", size: null, quantity: 1, price: 2.5 }
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
          assert.doesNotMatch(columns, /email|phone/, "receipt lookup avoids unnecessary contact data");
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
      order_number: "KH-RECEIPT-42",
      purchase_date: "2026-10-22T12:00:00.000Z",
      customer_name: "Synthetic Buyer",
      items: [
        { product_name: "Cotton top", size: "M", quantity: 2, unit_price: 20, line_total: 40 },
        { product_name: "Toy", size: "N/A", quantity: 1, unit_price: 2.5, line_total: 2.5 }
      ],
      total_amount: 42.5,
      payment_status: "Paid",
      payment_method: "Paystack",
      payment_reference: "KH-TEST-REFERENCE-42"
    });
    assert.doesNotMatch(JSON.stringify(successfulReceiptBody), /private@example|\+233000000042/, "receipt responses do not include customer email or phone");

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
        order_items: [{ product_name: "Cotton top", size: "M", quantity: 2, price: 20 }]
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
  console.log("All backend checks passed");
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
