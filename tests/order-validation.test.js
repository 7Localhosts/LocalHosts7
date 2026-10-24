const { test } = require("node:test");
const assert = require("node:assert/strict");
const { buildPricedItems } = require("../src/backend/order-utils");

const product = { id: "qa-toy", name: "Synthetic toy", category: "Toys", price: 12.35, is_active: true };

for (const quantity of [true, false, [], [2], {}, null, "", 0, -1, 1.5, Infinity, Number.MAX_SAFE_INTEGER + 1]) {
  test(`reject malformed quantity ${JSON.stringify(quantity)}`, () => {
    assert.throws(() => buildPricedItems([{ id: product.id, quantity }], [product]), /positive whole-number quantity/);
  });
}

for (const item of [null, false, "qa-toy", 42]) {
  test(`reject malformed cart item ${JSON.stringify(item)}`, () => {
    assert.throws(() => buildPricedItems([item], [product]), /Each item needs/);
  });
}

test("catalogue price wins over client price and totals preserve pesewas", () => {
  const result = buildPricedItems([{ id: product.id, quantity: "3", price: 0.01 }], [product]);
  assert.equal(result.total, 37.05);
  assert.equal(result.items[0].price, 12.35);
});

test("hidden and missing products cannot be purchased", () => {
  assert.throws(() => buildPricedItems([{ id: product.id, quantity: 1 }], [{ ...product, is_active: false }]), /no longer available/);
  assert.throws(() => buildPricedItems([{ id: "missing", quantity: 1 }], [product]), /no longer available/);
});
