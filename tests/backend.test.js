const assert = require("node:assert/strict");
const { createServer, validEmail, buildPricedItems } = require("../src/backend/server");

async function main() {
  console.log("Check email validation");
  assert.equal(validEmail("buyer@example.com"), true);
  assert.equal(validEmail(" buyer+tag@example.co.gh "), true);
  assert.equal(validEmail("buyer@"), false);
  assert.equal(validEmail(""), false);

  console.log("Check server prices, size options, and delivery fee");
  const products = [
    { id: 4, name: "Cotton top", price: 25.5, stock: 5, sizes: ["S", "M"] },
    { id: 5, name: "Toy", price: 10, stock: 4, sizes: [] }
  ];
  const result = buildPricedItems([
    { product_id: 4, quantity: 2, size: "M", price: 0.01 },
    { product_id: 5, quantity: 1 }
  ], products, 15);
  assert.equal(result.total, 76);
  assert.equal(result.items[0].price, 25.5);
  assert.equal(result.items[0].size, "M");

  console.log("Check required sizes and aggregate stock limits");
  const sizedProducts = [{ id: "shirt", name: "Shirt", price: 20, stock: 2, sizes: ["4Y", "6Y"] }];
  assert.throws(() => buildPricedItems([{ id: "shirt", quantity: 1 }], sizedProducts, 15), /size/i);
  assert.throws(() => buildPricedItems([
    { id: "shirt", quantity: 2, size: "4Y" },
    { id: "shirt", quantity: 1, size: "6Y" }
  ], sizedProducts, 15), /stock/i);

  console.log("Check backend health endpoint");
  const server = createServer();
  try {
    await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
    const baseUrl = `http://127.0.0.1:${server.address().port}`;
    const response = await fetch(`${baseUrl}/api/health`);
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { success: true, message: "Backend is running" });
    const configResponse = await fetch(`${baseUrl}/api/checkout/config`);
    assert.equal(configResponse.status, 200);
    assert.deepEqual(await configResponse.json(), { currency: "GHS", delivery_fee: 15 });
  } finally {
    await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  }
  console.log("All backend checks passed");
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
