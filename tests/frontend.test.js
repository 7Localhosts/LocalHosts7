const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const frontend = path.join(root, "src", "frontend");
const context = {};
vm.runInNewContext(fs.readFileSync(path.join(frontend, "product-images.js"), "utf8"), context);

for (const [product, prefix, base] of [
  [{ id: 1 }, "Images/", frontend],
  [{ id: "a-size-product" }, "../Images/", path.join(frontend, "products")]
]) {
  const imageUrl = context.productImageUrl(product, prefix);
  const imagePath = path.resolve(base, decodeURIComponent(imageUrl));
  assert.equal(fs.existsSync(imagePath), true, `fallback image exists: ${imageUrl}`);
}

const home = fs.readFileSync(path.join(frontend, "index.html"), "utf8");
const checkout = fs.readFileSync(path.join(frontend, "checkout", "checkout.html"), "utf8");
const checkoutScript = fs.readFileSync(path.join(frontend, "checkout", "checkout.js"), "utf8");
const productPage = fs.readFileSync(path.join(frontend, "products", "product.html"), "utf8");
assert.match(home, /policies\.html#delivery/);
assert.match(home, /policies\.html#feedback/);
assert.doesNotMatch(home, /checkoutModal|checkoutForm/);
assert.match(checkout, /Pay securely with Paystack/);
assert.match(checkoutScript, /\/payments\/initialize/);
assert.match(checkoutScript, /\/payments\/verify/);
assert.match(productPage, /product-images\.js/);

console.log("Frontend assets and checkout wiring passed");
