const assert = require("node:assert/strict");
const { createServer, validEmail, isValidOptionalEmail, isValidCheckoutContact, createGuestPaystackEmail, getPaystackConfiguration, buildPricedItems, canTransitionOrderStatus, isStoredProductImageUrl, describeProductImageStorageError } = require("../src/backend/server");

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
  assert.equal(getPaystackConfiguration("sk_test_example", "http://localhost/return").configured, false, "non-HTTPS callback disables checkout");
  assert.equal(getPaystackConfiguration("sk_test_example", "https://shop.example.co.gh/checkout/return").configured, true, "complete secure Paystack configuration enables checkout");
  assert.doesNotMatch(JSON.stringify(getPaystackConfiguration("sk_test_example", "https://shop.example.co.gh/checkout/return")), /sk_test_example/, "payment configuration never returns the secret");

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
  console.log("All backend checks passed");
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
