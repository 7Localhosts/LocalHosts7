const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const frontend = path.join(root, "src", "frontend");
const context = {};
vm.runInNewContext(fs.readFileSync(path.join(frontend, "product-images.js"), "utf8"), context);

assert.equal(context.productImageUrl({ id: 1 }), "", "unmapped products must not receive a recycled image");
const verifiedImageEntries = vm.runInNewContext("Array.from(verifiedProductImagesById.entries())", context);
assert.equal(verifiedImageEntries.length, 73, "only the visually verified product assignments are active");
for (const [id, filename] of verifiedImageEntries) {
  assert.equal(fs.existsSync(path.join(frontend, "product-images", filename)), true, `verified file exists for product ${id}: ${filename}`);
}
for (const product of [
  { id: 52, name: "Tommee tipped bottle and warmer", image: "Images/catalog-cleaned/tommee-tipped-bottle-and-warmer.jpg" },
  { id: 15, name: "Pink Baby Layette Bodysuit" },
  { id: 187, name: "Smiggle blue back pack", image: "Images/catalog-cleaned/smiggle-blue-back-pack.jpg" }
]) {
  const imageUrl = context.productImageUrl(product);
  assert.equal(imageUrl, `product-images/${verifiedImageEntries.find(([id]) => id === String(product.id))[1]}`);
  assert.equal(fs.existsSync(path.join(frontend, imageUrl)), true, `verified catalogue product resolves a file: ${imageUrl}`);
}
assert.equal(context.productImageUrl({ name: "An unmapped item" }), "", "unmatched products keep an honest image fallback");
assert.deepEqual(Array.from(context.productSizeOptions({ name: "Mermaid Tutu Dress", category: "Kids", sizes: [] })), ["S", "M", "L", "XL"]);
assert.deepEqual(Array.from(context.productSizeOptions({ name: "Soft toy doll", category: "Toys", sizes: [] })), []);
assert.deepEqual(Array.from(context.productSizeOptions({ name: "Bottle brush", category: "Accessories", sizes: [] })), []);
assert.equal(context.productImageUrl({ id: 5, name: "Little Angel", image: "https://images.example/item.jpg" }), "https://images.example/item.jpg", "unmapped saved product URLs remain usable");
assert.equal(context.productImageUrl({ id: 52, image: "https://store.supabase.co/storage/v1/object/public/kays-haven-products/9efc40bb-1145-4e62-84b4-3e6776ec5c2e.webp" }), "https://store.supabase.co/storage/v1/object/public/kays-haven-products/9efc40bb-1145-4e62-84b4-3e6776ec5c2e.webp", "a saved storage URL takes precedence over a legacy local mapping");
assert.equal(context.productImageUrl({ id: 51, name: "Little angel", image: "Images/catalog-cleaned/little-angel.jpg" }), "", "missing edited sources do not leave broken legacy paths");
assert.equal(context.productImageUrl({ id: 16, name: "Monsoon Blue Floral Dress", image: "Images/catalog-cleaned/monsoon-blue-floral-dress.jpg" }), "", "visually conflicting products remain unmapped");
assert.equal(context.productImageUrl({ name: "Pink Baby Layette Bodysuit" }), "product-images/15-pink-baby-layette-bodysuit.png", "exact-name verified mappings resolve the renamed asset");
assert.equal(context.productImageUrl({ id: 71, name: "Blue red. 3pk sleep suit" }), "product-images/71-blue-red-3pk-sleep-suit.png", "the verified baby sleepsuit photo resolves for its matched product ID");
assert.equal(context.productImageUrl({ id: 23, name: "Blue Red 3pk Sleepsuit" }), "", "a similarly named teen catalogue row does not inherit the baby sleepsuit photo");
for (const [product, prefix, base] of [
  [{ id: 52, image: "Images/catalog-cleaned/tommee-tipped-bottle-and-warmer.jpg" }, "product-images/", frontend],
  [{ id: 52, image: "Images/catalog-cleaned/tommee-tipped-bottle-and-warmer.jpg" }, "../product-images/", path.join(frontend, "products")],
  [{ id: 52, image: "catalog-cleaned/tommee-tipped-bottle-and-warmer.jpg" }, "product-images/", frontend],
  [{ id: 52, image: "catalog-cleaned\\tommee-tipped-bottle-and-warmer.jpg" }, "../product-images/", path.join(frontend, "products")]
]) {
  const imageUrl = context.productImageUrl(product, prefix);
  const imagePath = path.resolve(base, decodeURIComponent(imageUrl));
  assert.equal(fs.existsSync(imagePath), true, `fallback image exists: ${imageUrl}`);
}

const landing = fs.readFileSync(path.join(frontend, "index.html"), "utf8");
const shop = fs.readFileSync(path.join(frontend, "shop.html"), "utf8");
const checkout = fs.readFileSync(path.join(frontend, "checkout", "checkout.html"), "utf8");
const checkoutScript = fs.readFileSync(path.join(frontend, "checkout", "checkout.js"), "utf8");
const productPage = fs.readFileSync(path.join(frontend, "products", "product.html"), "utf8");
const cartPage = fs.readFileSync(path.join(frontend, "cart", "cart.html"), "utf8");
const cartScript = fs.readFileSync(path.join(frontend, "cart", "cart.js"), "utf8");
const storefrontScript = fs.readFileSync(path.join(frontend, "script.js"), "utf8");
const productScript = fs.readFileSync(path.join(frontend, "products", "product.js"), "utf8");
const apiConfig = fs.readFileSync(path.join(frontend, "api-config.js"), "utf8");
const adminPage = fs.readFileSync(path.join(root, "src", "admin", "index.html"), "utf8");
const adminScript = fs.readFileSync(path.join(root, "src", "admin", "app.js"), "utf8");
const adminStyles = fs.readFileSync(path.join(root, "src", "admin", "styles.css"), "utf8");
const backendSource = fs.readFileSync(path.join(root, "src", "backend", "server.js"), "utf8");
const staticBuild = fs.readFileSync(path.join(root, "deployment", "build-static.js"), "utf8");
const localPreview = fs.readFileSync(path.join(root, "deployment", "serve-local.js"), "utf8");
assert.match(landing, /<p class="landing-welcome">Welcome to<\/p>/);
assert.match(landing, /class="landing-wordmark kh-brand"[^>]*><span class="kh-brand__kays">Kay's<\/span><span class="kh-brand__haven">Haven<\/span><\/p>/);
assert.match(landing, /<p class="landing-slogan"[^>]*>Quality products from crib to campus\.<\/p>/);
assert.match(landing, /href="shop\.html">Enter Shop<\/a>/);
assert.doesNotMatch(landing, /href="#shop"/);
assert.match(landing, /src="site-assets\/landing-mother-and-baby-clean\.png"/);
assert.equal(fs.existsSync(path.join(frontend, "site-assets", "landing-mother-and-baby-clean.png")), true);
assert.doesNotMatch(landing, /landing-approved-mobile/);
assert.doesNotMatch(landing, /brand-flourish|<svg/);
const brandStyles = fs.readFileSync(path.join(frontend, "brand-system.css"), "utf8");
const landingStyles = fs.readFileSync(path.join(frontend, "landing.css"), "utf8");
assert.match(landingStyles, /\.landing-background\s*\{[^}]*object-fit:\s*cover/s);
assert.match(brandStyles, /\.kh-brand__kays\s*\{[^}]*font-family:\s*"Montserrat"[^}]*font-style:\s*normal[^}]*font-weight:\s*700/s);
assert.match(brandStyles, /\.kh-brand__haven\s*\{[^}]*font-family:\s*"Playfair Display"[^}]*font-style:\s*italic[^}]*font-weight:\s*700/s);
assert.match(landingStyles, /\.landing-copy\s*\{[^}]*background:\s*rgba\(255, 255, 255,/s);
assert.match(fs.readFileSync(path.join(frontend, "landing.css"), "utf8"), /landing-cover[^\n]*align-items: center; justify-content: center/);
assert.match(fs.readFileSync(path.join(frontend, "landing.css"), "utf8"), /prefers-reduced-motion/);
assert.doesNotMatch(fs.readFileSync(path.join(frontend, "landing.css"), "utf8"), /Allura/);
assert.doesNotMatch(landing, /<footer|social-links/);
assert.doesNotMatch(shop, /class="hero"|hero-mother-and-baby|id="landing-title"|Enter Shop|Growing with them, every step of the way|newsletterForm/);
for (const category of ["Baby", "Toddler", "Kids", "Teens", "Toys", "Accessories", "Back to School", "Clearance"]) {
  assert.match(shop, new RegExp(`data-category="${category}"`), `shop includes ${category} category`);
}
assert.match(shop, /id="productGrid"/);
assert.match(shop, /id="icon-baby"/);
assert.match(shop, /id="icon-school"/);
assert.match(shop, /aria-label="Open shopping cart, 0 items"/);
assert.doesNotMatch(shop, />Cart\s*<span id="cartCount"/);
assert.match(shop, /<svg class="nav-icon" aria-hidden="true"><use href="#icon-info"\/><\/svg>About/);
assert.match(shop, /<svg class="category-icon" aria-hidden="true"><use href="#icon-tag"\/><\/svg>/);
assert.equal((shop.match(/<footer\b/g) || []).length, 1, "the storefront retains its single shared footer");
assert.match(storefrontScript, /Number\.isFinite\(Number\(product\.price\)\) && Number\(product\.price\) > 0/);
assert.doesNotMatch(storefrontScript, /Out of stock|Maximum available stock reached|stock\s*<=\s*0/i);
assert.match(storefrontScript, /const showBadge = badge && !\/\\bout\\s\+of\\s\+stock\\b\/i\.test\(badge\)/);
assert.doesNotMatch(storefrontScript, /filter\(product => Number\(product\.stock/);
assert.doesNotMatch(cartScript, /stock|Out of Stock/i);
assert.doesNotMatch(checkoutScript, /stock|Out of Stock/i);
assert.match(productScript, /textContent = priceIsValid \? money\(price\) : "Price unavailable"/);
assert.match(productScript, /addButton\.disabled = !priceIsValid/);
assert.match(productPage, /<main class="product-page" aria-busy="true">/);
assert.match(productPage, /id="product-loading"[^>]*role="status"/);
assert.match(productPage, /class="product-details" hidden/);
assert.match(productScript, /details\.hidden = false/);
assert.match(productScript, /loading\.hidden = true/);
assert.match(productScript, /page\.setAttribute\("aria-busy", "false"\)/);
assert.doesNotMatch(productPage, /10\s+in stock/i);
assert.doesNotMatch(productPage, /product-stock/);
assert.doesNotMatch(productScript, /stock|Out of Stock/i);
assert.match(productScript, /decreaseQuantity\.onclick = \(\) => quantity\.value = Math\.max\(1/);
assert.match(productScript, /increaseQuantity\.onclick = \(\) => quantity\.value = Math\.max\(1/);
assert.match(productScript, /quantity\.removeAttribute\("max"\)/);
assert.match(productPage, /id="decrease-quantity"/);
assert.match(productPage, /id="increase-quantity"/);
assert.match(productPage, /option value="">None \/ N\/A<\/option>/);
assert.match(productScript, /sizeSelect\.required = sizes\.length > 0/);
assert.match(productScript, /sizeLabel\(size\)/);
assert.match(productScript, /size, qty/);
assert.match(productPage, /class="product-purchase-controls"/);
assert.match(shop, /policies\.html#collection/);
assert.match(shop, /policies\.html#feedback/);
assert.doesNotMatch(shop, /checkoutModal|checkoutForm/);
assert.match(checkout, /Pay securely with Paystack/);
assert.match(checkout, /product-images\.js/);
assert.match(checkoutScript, /\/payments\/initialize/);
assert.match(checkoutScript, /\/payments\/verify/);
assert.match(checkoutScript, /class="checkout-item-image"/);
assert.match(productPage, /product-images\.js/);
assert.match(shop, /Kay%E2%80%99s%20Haven%20Lavender%20Emblem\.png/);
assert.doesNotMatch(shop, /src="Images\/hero-mother-and-baby\.avif"/);
assert.doesNotMatch(shop, /photo-credit|pexels\.com\/photo\/smiling-mother-and-baby-looking-at-camera-6393377/);
assert.equal(fs.existsSync(path.join(frontend, "images", "hero-mother-and-baby.avif")), true);
assert.match(shop, /rel="icon"[^>]+Kay%E2%80%99s%20Haven%20Lavender%20Emblem\.png/);
assert.equal(fs.existsSync(path.join(frontend, "images", "Kay’s Haven Lavender Emblem.png")), true);
assert.match(shop, /class="logo kh-brand"[^>]*>\s*<span class="kh-brand__kays">Kay's<\/span><span class="kh-brand__haven">Haven<\/span>/);
assert.match(fs.readFileSync(path.join(frontend, "styles.css"), "utf8"), /\.logo \.kh-brand__haven\s*\{[^}]*font-family:\s*"Playfair Display"[^}]*font-weight:\s*700/s);
assert.doesNotMatch(shop, /searchBtn|searchPanel|Search products/);
assert.doesNotMatch(storefrontScript, /searchBtn|searchPanel|searchInput/);
assert.match(shop, /<span>Quality products<\/span> <em>from crib to campus\.<\/em>/);
assert.match(shop, /aria-label="Open menu" aria-controls="mobileNav" aria-expanded="false"><span><\/span><span><\/span><span><\/span>/);
assert.equal((shop.match(/href="\.\.\/admin\/"/g) || []).length, 2, "desktop and mobile storefront Login links target the sibling admin directory from frontend roots");
assert.match(shop, /social-links[\s\S]*?aria-label="Instagram: @kayshaven\.mothercare"[\s\S]*?<svg/);
assert.match(shop, /social-links[\s\S]*?aria-label="Facebook: Kay's Haven"[\s\S]*?<svg/);
assert.match(fs.readFileSync(path.join(root, "DESIGN_SYSTEM.md"), "utf8"), /#000000[\s\S]*?black footer/i);
assert.match(shop, /id="mobileNav"[^>]*hidden/);
assert.match(cartPage, /id="checkout-button"/);
assert.match(cartScript, /window\.location\.href\s*=\s*"\.\.\/checkout\/checkout\.html"/);
assert.match(storefrontScript, /window\.location\.href\s*=\s*"checkout\/checkout\.html"/);
assert.match(cartScript, /class="cart-item-image" src=/);
assert.match(cartScript, /class="cart-item-info"/);
assert.match(cartScript, /class="remove"[^>]+data-remove=/);
assert.match(cartScript, /aria-label="Remove \$\{safe\(item\.name\)\} from cart"[\s\S]*?<svg class="trash-icon"/);
assert.match(cartPage, /cart-heading-icon/);
assert.match(cartPage, /class="eyebrow kh-brand cart-brand"[^>]*><span class="kh-brand__kays">Kay's/);
assert.match(fs.readFileSync(path.join(frontend, "cart", "cart.css"), "utf8"), /\.cart-item-info\s*\{/);
assert.match(checkout, /id="confirmation-view" hidden/);
assert.match(checkoutScript, /\/payments\/verify/);
assert.match(checkoutScript, /window\.addEventListener\("storage"/);
assert.doesNotMatch(checkoutScript, /checkoutConfigReady|DELIVERY_FEE|shipping_address|delivery_fee/i);
assert.match(checkoutScript, /expected_total: currentCartTotal\(lines\)/);
assert.match(checkoutScript, /imageAvailable !== true/);
assert.match(cartScript, /refreshCartAvailability\(\)/);
assert.match(cartScript, /cartAvailability\.get\(String\(item\.id\)\) !== true/);
assert.doesNotMatch(checkout, /transport-note|#collection|transport information/i);
assert.match(checkout, /class="kh-brand checkout-brand"/);
assert.match(checkout, /Customer information/);
assert.match(fs.readFileSync(path.join(frontend, "checkout", "checkout.css"), "utf8"), /\.panel h2\s*\{[\s\S]*?font-family: "Montserrat"/);
assert.match(checkoutScript, /document\.getElementById\("confirmation-view"\)\.hidden = false/);
assert.match(fs.readFileSync(path.join(frontend, "checkout", "checkout.css"), "utf8"), /#confirmation-view:not\(\[hidden\]\)\s*\{\s*display:\s*block/);
assert.match(adminPage, /id="refresh-orders"/);
assert.match(adminPage, /id="inventory-image-file"[^>]*type="file"[^>]*required/);
assert.doesNotMatch(adminPage, /name="(?:quantity|description|sizes)"|Current stock/i);
assert.match(adminPage, /id="bulk-product-images"[^>]*multiple/);
assert.match(adminPage, /id="save-bulk-products"[^>]*>Save All Products/);
assert.match(adminPage, /id="bulk-product-list"/);
assert.match(adminPage, /inventory-upload-preview/);
assert.match(adminPage, /data-inventory-tab="single"[^>]*>Add Single Product/);
assert.match(adminPage, /data-inventory-tab="bulk"[^>]*>Add Multiple Products/);
assert.match(adminPage, /data-inventory-tab="view"[^>]*>View Products/);
assert.match(adminPage, /id="inventory-panel-single"[^>]*role="tabpanel"/);
assert.match(adminPage, /id="inventory-panel-bulk"[^>]*role="tabpanel"[^>]*hidden/);
assert.match(adminPage, /id="inventory-panel-view"[^>]*role="tabpanel"[^>]*hidden/);
assert.match(adminPage, /type="reset">Clear Form/);
assert.match(adminPage, /id="inventory-category-filter"/);
assert.match(adminPage, /id="inventory-list-feedback"/);
assert.match(adminPage, /id="inventory-rows"[^>]*role="list"/);
assert.match(adminPage, /product-images\.js/);
assert.match(adminPage, /rel="icon"[^>]+Kay%E2%80%99s%20Haven%20Lavender%20Emblem\.png/);
assert.match(adminPage, /src="\.\.\/frontend\/site-assets\/landing-mother-and-baby-clean\.png"/);
assert.doesNotMatch(adminPage, /Welcome Back|Sign in to access the Kay's Haven staff workspace\./i);
assert.doesNotMatch(adminPage, /Image URL|Reorder at/);
assert.match(adminPage, /PRODUCT CATALOGUE/);
assert.doesNotMatch(adminPage, /<th>CURRENT STOCK<\/th>/);
assert.match(adminPage, /Customer Orders/);
assert.doesNotMatch(adminPage, /<p class="eyebrow">\s*ORDERS\s*<\/p>/);
assert.match(adminPage, /id="orders-active-rows"[^>]*role="list"/);
assert.match(adminPage, /id="orders-payment-issues-rows"[^>]*role="list"/);
assert.match(adminPage, /id="orders-history-rows"[^>]*role="list"/);
assert.match(adminPage, /data-orders-toggle-all="active"[^>]*aria-controls="orders-active-rows"[^>]*aria-expanded="false"/);
assert.match(adminPage, /data-orders-toggle-all="payment-issues"[^>]*aria-controls="orders-payment-issues-rows"[^>]*aria-expanded="false"/);
assert.match(adminPage, /data-orders-toggle-all="history"[^>]*aria-controls="orders-history-rows"[^>]*aria-expanded="false"/);
assert.match(adminPage, /id="orders-search-input"[^>]*type="search"/);
assert.doesNotMatch(adminPage, /<th>DELIVERY<\/th>|<th>PAYMENT<\/th>|<th>FULFILLMENT<\/th>/);
assert.match(adminPage, /href="\.\.\/shop\.html"/);
assert.match(adminPage, /class="login-wordmark kh-brand"[^>]*>\s*<span class="kh-brand__kays">Kay's<\/span><span class="kh-brand__haven">Haven<\/span>/);
assert.doesNotMatch(adminPage, /photo-credit|pexels\.com\/photo\/smiling-mother-and-baby-looking-at-camera-6393377/);
assert.doesNotMatch(adminScript, /status-history|order-history-tab/);
assert.doesNotMatch(adminScript, /data-save-order-status|data-order-status|Fulfillment status|status-save/);
assert.match(adminScript, /function groupOrdersById\(rows\)/);
assert.match(adminScript, /card\.className = "admin-order-card"/);
assert.doesNotMatch(adminScript, /groupOrdersByCustomer\(rows\)/);
assert.match(adminScript, /className = "admin-order-card-header"/);
assert.match(adminScript, /className = "order-items-heading"/);
assert.match(adminScript, /card\.dataset\.expanded = "false"/);
assert.match(adminScript, /toggle\.dataset\.orderToggle = ""/);
assert.match(adminScript, /toggle\.textContent = "View"/);
assert.match(adminScript, /button\.textContent = expanded \? "View" : "Hide"/);
assert.match(adminScript, /details\.inert = expanded/);
assert.match(adminScript, /card\.dataset\.expanded = "false"/);
const toggleStart = adminScript.indexOf("function toggleOrderCardDetails(");
const toggleEnd = adminScript.indexOf("\nfunction appendField", toggleStart);
assert.ok(toggleStart >= 0 && toggleEnd > toggleStart, "order detail toggle helper is defined");
const toggleContext = {};
vm.runInNewContext(`${adminScript.slice(toggleStart, toggleEnd)}\nglobalThis.toggle = toggleOrderCardDetails; globalThis.updateSection = updateOrderSectionToggle; globalThis.setSection = setOrderSectionExpanded;`, toggleContext);
function fakeOrderCard() {
  return {
    card: { dataset: { expanded: "false" } },
    button: { textContent: "View", attributes: {}, setAttribute(name, value) { this.attributes[name] = value; } },
    details: { inert: true, attributes: {}, setAttribute(name, value) { this.attributes[name] = value; } }
  };
}
const firstOrderCard = fakeOrderCard();
const secondOrderCard = fakeOrderCard();
toggleContext.toggle(firstOrderCard.card, firstOrderCard.button, firstOrderCard.details);
assert.equal(firstOrderCard.card.dataset.expanded, "true");
assert.equal(firstOrderCard.button.textContent, "Hide");
assert.equal(firstOrderCard.button.attributes["aria-expanded"], "true");
assert.equal(firstOrderCard.details.inert, false);
assert.equal(secondOrderCard.card.dataset.expanded, "false", "expanding one order leaves another order collapsed");
toggleContext.toggle(firstOrderCard.card, firstOrderCard.button, firstOrderCard.details);
assert.equal(firstOrderCard.card.dataset.expanded, "false");
assert.equal(firstOrderCard.button.textContent, "View");
assert.equal(firstOrderCard.details.inert, true);
const refreshedOrderCard = fakeOrderCard();
assert.equal(refreshedOrderCard.card.dataset.expanded, "false", "freshly rendered orders remain collapsed after refresh");
function makeOrdersSection(cards, kind) {
  const container = {
    querySelectorAll(selector) { return selector === ".admin-order-card" ? cards.map(entry => entry.card) : []; }
  };
  const sectionToggle = {
    dataset: { ordersToggleAll: kind },
    textContent: "View All",
    disabled: true,
    attributes: { "aria-expanded": "false" },
    setAttribute(name, value) { this.attributes[name] = value; }
  };
  for (const entry of cards) {
    entry.card.querySelector = selector => selector === "[data-order-toggle]" ? entry.button : selector === "[data-order-details]" ? entry.details : null;
  }
  return { container, sectionToggle };
}
const activeOne = fakeOrderCard();
const activeTwo = fakeOrderCard();
const historyOne = fakeOrderCard();
const activeSection = makeOrdersSection([activeOne, activeTwo], "active");
const historySection = makeOrdersSection([historyOne], "history");
toggleContext.updateSection(activeSection.container, activeSection.sectionToggle);
toggleContext.updateSection(historySection.container, historySection.sectionToggle);
assert.equal(activeSection.sectionToggle.disabled, false, "nonempty sections enable their own bulk toggle");
assert.equal(historySection.sectionToggle.attributes["aria-expanded"], "false");
toggleContext.setSection(activeSection.container, activeSection.sectionToggle, true);
assert.equal(activeOne.card.dataset.expanded, "true");
assert.equal(activeTwo.card.dataset.expanded, "true");
assert.equal(historyOne.card.dataset.expanded, "false", "expanding Active Orders does not change History");
assert.equal(activeSection.sectionToggle.textContent, "Hide All");
assert.equal(activeSection.sectionToggle.attributes["aria-expanded"], "true");
toggleContext.setSection(activeSection.container, activeSection.sectionToggle, false);
assert.equal(activeOne.card.dataset.expanded, "false");
assert.equal(activeTwo.card.dataset.expanded, "false");
assert.equal(activeSection.sectionToggle.textContent, "View All");
toggleContext.toggle(activeOne.card, activeOne.button, activeOne.details);
toggleContext.updateSection(activeSection.container, activeSection.sectionToggle);
assert.equal(activeSection.sectionToggle.textContent, "View All", "mixed individual states retain a View All action");
const emptySection = makeOrdersSection([], "history");
toggleContext.updateSection(emptySection.container, emptySection.sectionToggle);
assert.equal(emptySection.sectionToggle.disabled, true, "empty sections disable the bulk control");
assert.equal(emptySection.sectionToggle.attributes["aria-label"], "No order history to expand");
const paymentReviewSection = makeOrdersSection([fakeOrderCard()], "payment-issues");
toggleContext.updateSection(paymentReviewSection.container, paymentReviewSection.sectionToggle);
assert.equal(paymentReviewSection.sectionToggle.attributes["aria-label"], "View all payment review orders");
const classificationStart = adminScript.indexOf("function isHistoryOrder(");
const classificationEnd = adminScript.indexOf("\nfunction toggleOrderCardDetails(", classificationStart);
const classificationContext = {};
assert.ok(classificationStart >= 0 && classificationEnd > classificationStart, "order section classification helpers are defined");
vm.runInNewContext(`${adminScript.slice(classificationStart, classificationEnd)}\nglobalThis.isHistory = isHistoryOrder; globalThis.isPaymentIssue = isPaymentIssueOrder; globalThis.isActiveFulfillment = isActiveFulfillmentOrder; globalThis.canComplete = canCompleteOrder;`, classificationContext);
const pendingUnpaidOrder = { status: "Pending", payment_status: "pending" };
const paymentFailedOrder = { status: "Payment setup failed", payment_status: "failed" };
const completedOrder = { status: "Completed", payment_status: "paid" };
const canceledOrder = { status: "Canceled", payment_status: "failed" };
assert.equal(classificationContext.isActiveFulfillment(pendingUnpaidOrder), true, "pending orders remain in Active Orders");
assert.equal(classificationContext.isPaymentIssue(paymentFailedOrder), true, "failed payment attempts are routed for admin review");
assert.equal(classificationContext.isActiveFulfillment(paymentFailedOrder), false, "failed payments are excluded from active fulfilment");
assert.equal(classificationContext.isHistory(completedOrder), true, "completed orders remain in history");
assert.equal(classificationContext.isHistory(canceledOrder), true, "canceled unpaid orders remain in history");
assert.equal(classificationContext.canComplete(pendingUnpaidOrder), false, "the UI cannot offer completion for an unpaid order");
assert.equal(classificationContext.canComplete({ status: "Pending", payment_status: "PAID" }), true, "verified paid orders may be completed");
assert.match(adminScript, /function isHistoryOrder\(order\)/);
assert.match(adminScript, /function isPaymentIssueOrder\(order\)/);
assert.match(adminScript, /function isActiveFulfillmentOrder\(order\)/);
assert.match(adminScript, /function canCompleteOrder\(order\)/);
assert.match(adminScript, /if \(!paymentReview && canCompleteOrder\(order\)\) availableActions\.push\(\["Completed", "Complete Order", "button-primary"\]\)/);
assert.match(adminScript, /availableActions\.push\(\["Canceled", "Cancel Order", "button-secondary"\]\)/);
assert.match(adminScript, /appendField\(customerFields, "Phone", order\.phone\)/);
assert.match(adminScript, /appendField\(expandedCustomer, "Customer email", order\.email\)/);
assert.match(adminScript, /appendField\(customerFields, "Order number"/);
assert.doesNotMatch(adminScript, /shipping_address|Delivery address/);
assert.match(adminScript, /appendField\(summary, "Payment status", order\.payment_status\)/);
assert.match(adminScript, /Size: \$\{String\(item\.size \|\| "N\/A"\)\}/);
assert.match(adminScript, /appendField\(summary, "Order date", formatDate\(order\.created_at\)/);
assert.match(adminScript, /appendField\(meta, "Payment method", order\.payment_method\)/);
assert.match(adminScript, /\["Line total", formatOrderMoney\(Number\(item\.price \|\| 0\) \* Number\(item\.quantity \|\| 0\)\)\]/);
assert.match(adminScript, /productImageUrl\(imageProduct, "\.\.\/frontend\/product-images\/"\)/);
assert.match(adminScript, /orders = groupOrdersById\(Array\.isArray\(result\.orders\) \? result\.orders : \[\]\)\s*\.sort\(\(a, b\) => Date\.parse\(b\.created_at \|\| ""\) - Date\.parse\(a\.created_at \|\| ""\)\)/);
assert.match(adminScript, /appendField\(summary, "Order total", formatOrderMoney\(order\.total_amount\)/);
assert.match(adminScript, /button\.dataset\.orderAction = status/);
assert.match(adminScript, /toggle\.dataset\.orderToggle = ""/);
assert.match(adminScript, /toggle\.setAttribute\("aria-expanded", "false"\)/);
assert.match(adminScript, /details\.inert = true/);
assert.match(adminScript, /availabilityButton\.dataset\.nextActive = String\(product\.is_active === false\)/);
assert.match(adminScript, /product\.is_active === false \? "Restore to Storefront" : "Remove from Storefront"/);
assert.match(adminScript, /JSON\.stringify\(\{ is_active: isActive \}\)/);
assert.match(adminScript, /Complete Order/);
assert.match(adminScript, /Cancel Order/);
assert.match(adminScript, /"Order number"/);
assert.match(adminScript, /data-delete-product/);
assert.match(adminScript, /method: "DELETE"/);
assert.match(adminScript, /JSON\.stringify\(\{ is_active: isActive \}\)/);
assert.match(adminScript, /include_inactive=true/);
assert.match(adminScript, /orders-active-rows/);
assert.match(adminScript, /orders-payment-issues-rows/);
assert.match(adminScript, /orders-history-rows/);
assert.match(adminScript, /updates\.image = image/);
assert.doesNotMatch(adminScript, /data-product-image=|formData\.get\("image"\)/);
assert.match(adminScript, /api\/products\/images/);
assert.match(adminScript, /function uploadProductImage\(file\)/);
assert.match(adminScript, /function renderBulkProductEntries\(\)/);
assert.match(adminScript, /function addBulkImages\(files\)/);
assert.match(adminScript, /bulkSaveInProgress/);
assert.match(adminScript, /Saved and published/);
assert.match(adminScript, /Uploading image and saving product details/);
assert.match(adminScript, /inventory-product-image/);
assert.match(adminScript, /function activateInventoryTab\(tabName/);
assert.match(adminScript, /data-product-editor/);
assert.match(adminScript, /data-cancel-product-edit/);
assert.match(adminScript, /inventoryCategoryFilter\?\.addEventListener\("change", renderInventory\)/);
assert.match(adminScript, /Hide \$\{product\?\.name \|\| "this product"\} from the storefront/);
assert.match(adminScript, /method: "PATCH", headers: authHeaders\(\), body: JSON\.stringify\(updates\)/);
assert.match(adminScript, /URL\.createObjectURL\(file\)/);
assert.match(backendSource, /api\/products\/images/);
assert.match(backendSource, /isStoredProductImageUrl\(image\)/);
assert.match(backendSource, /include_inactive/);
assert.match(backendSource, /eq\("is_active", true\)/);
assert.match(fs.readFileSync(path.join(root, "src", "backend", "order-utils.js"), "utf8"), /if \(product\.is_active === false\)/);
assert.doesNotMatch(backendSource, /select\("id, name, price, stock, sizes, is_active"\)/);
assert.match(backendSource, /update\.is_active = body\.is_active/);
assert.match(backendSource, /delete_product_without_orders/);
assert.match(backendSource, /createGuestPaystackEmail/);
assert.match(backendSource, /email: email \|\| null/);
assert.match(backendSource, /sizes: \[\.\.\.new Set\(sizes\.map/);
assert.doesNotMatch(backendSource, /shipping_address:/);
const checkoutHtml = fs.readFileSync(path.join(frontend, "checkout", "checkout.html"), "utf8");
assert.match(checkoutHtml, /id="email" name="email" type="email" autocomplete="email" aria-describedby="email-help"/);
assert.doesNotMatch(checkoutHtml, /id="email"[^>]*required/);
assert.match(checkoutHtml, /Email address \(optional\)/);
assert.match(fs.readFileSync(path.join(root, "supabase", "migrations", "202610150001_optional_guest_checkout_and_product_visibility.sql"), "utf8"), /alter column email drop not null[\s\S]*?add column if not exists is_active[\s\S]*?delete_product_without_orders/);
assert.match(fs.readFileSync(path.join(frontend, "script.js"), "utf8"), /productsWithLoadedImages/);
assert.match(fs.readFileSync(path.join(frontend, "script.js"), "utf8"), /productImageLoads\(imageUrl\)/);
assert.doesNotMatch(fs.readFileSync(path.join(frontend, "script.js"), "utf8"), /placeholder.*Product image unavailable/);
assert.match(fs.readFileSync(path.join(frontend, "product-images.js"), "utf8"), /productImageLoads/);
assert.match(productScript, /await productImageLoads\(absoluteImageUrl\)/);
assert.match(adminScript, /function restoreStaffSession\(\)/);
assert.match(adminScript, /sessionStorage\.getItem\("kayshaven-access-token"\)/);
assert.match(adminScript, /#profile-name/);
assert.doesNotMatch(adminStyles, /status-history/);
assert.doesNotMatch(backendSource, /status-history|order_status_history/);
assert.match(adminScript, /24 \* 60 \* 60 \* 1000/);
assert.match(adminScript, /function filterOrders\(query\)/);
assert.match(adminScript, /productImageUrl\(product, "\.\.\/frontend\/product-images\/"\)/);
assert.match(adminStyles, /\.order-product-row\s*\{[^}]*grid-template-columns/s);
assert.match(adminStyles, /\.order-card-summary\s*\{[^}]*padding-top:/s);
assert.match(adminStyles, /Playfair Display[^}]+font-style:\s*italic/);
assert.match(adminStyles, /@media \(max-width: 640px\)\s*\{[\s\S]*?\.order-product-row\s*\{[^}]*grid-template-columns/s);
assert.match(adminStyles, /\.login-intro-card\s*\{[^}]*background:/s);
assert.match(adminStyles, /\.login-photo\s*\{[^}]*object-fit:\s*cover/s);
assert.match(adminStyles, /\.order-card-meta\s*\{[^}]*grid-template-columns:/s);
assert.match(adminStyles, /aspect-ratio:\s*148 \/ 210/);
assert.match(adminStyles, /\.admin-order-card\[data-long-order="true"\]\s*\{\s*aspect-ratio:\s*auto/);
assert.match(adminStyles, /\.admin-order-card\[data-expanded="true"\] \.order-details-panel\s*\{\s*grid-template-rows:\s*1fr/);
assert.match(adminStyles, /\.admin-order-card\s*\{[\s\S]*?max-width:\s*520px/);
assert.match(adminStyles, /\.order-details-panel\s*\{[\s\S]*?transition:\s*grid-template-rows \.28s ease, opacity \.2s ease/);
assert.match(adminStyles, /prefers-reduced-motion:\s*reduce/);
const stockAvailabilityMigration = fs.readFileSync(path.join(root, "supabase", "migrations", "202610150002_availability_not_limited_by_legacy_stock.sql"), "utf8");
assert.match(stockAvailabilityMigration, /create or replace function public\.finalize_paid_order/);
assert.match(stockAvailabilityMigration, /set payment_status = 'paid'/);
assert.doesNotMatch(stockAvailabilityMigration, /stock\s*=\s*stock\s*-/i);
assert.match(fs.readFileSync(path.join(frontend, "styles.css"), "utf8"), /\.product-image img\s*\{[^}]*object-fit:\s*contain/s);
assert.match(fs.readFileSync(path.join(frontend, "products", "product.css"), "utf8"), /\.product-image img\s*\{[^}]*object-fit:\s*contain/s);
assert.match(fs.readFileSync(path.join(frontend, "cart", "cart.css"), "utf8"), /cart-item-image[^}]*object-fit:\s*contain/s);
assert.match(fs.readFileSync(path.join(frontend, "checkout", "checkout.css"), "utf8"), /\.checkout-item-image\s*\{[^}]*object-fit:\s*contain/s);
assert.match(backendSource, /canTransitionOrderStatus\(existing\.status, existing\.payment_status, status\)/);
assert.match(backendSource, /if \(!\["Completed", "Canceled"\]\.includes\(status\)\)/);
assert.match(backendSource, /size\s*\n\s*\)/);
assert.doesNotMatch(backendSource, /readDeliveryFee|DELIVERY_FEE_GHS|delivery_fee/i);
assert.match(backendSource, /expected_total/);
assert.match(backendSource, /amount: Math\.round\(priced\.total \* 100\)/);
assert.match(staticBuild, /\.replace\("\.\.\/frontend\/site-assets\/Kay%E2%80%99s%20Haven%20Lavender%20Emblem\.png", "\.\.\/site-assets\/Kay%E2%80%99s%20Haven%20Lavender%20Emblem\.png"\)/);
assert.match(staticBuild, /\.replace\("\.\.\/frontend\/site-assets\/landing-mother-and-baby-clean\.png", "\.\.\/site-assets\/landing-mother-and-baby-clean\.png"\)/);
assert.match(staticBuild, /replaceAll\("\.\.\/frontend\/product-images\/", "\.\.\/product-images\/"\)/);
assert.match(localPreview, /process\.env\.STATIC_PORT \|\| 5502/);
const allCss = [
  fs.readFileSync(path.join(frontend, "styles.css"), "utf8"),
  fs.readFileSync(path.join(frontend, "cart", "cart.css"), "utf8"),
  fs.readFileSync(path.join(frontend, "checkout", "checkout.css"), "utf8"),
  fs.readFileSync(path.join(frontend, "products", "product.css"), "utf8"),
  fs.readFileSync(path.join(frontend, "landing.css"), "utf8"),
  adminStyles
].join("\n");
assert.doesNotMatch(allCss, /#f4dce9|#6a1745|#c00000|#c0392b|--pink\s*:|--rose\s*:/i);
assert.doesNotMatch(allCss, /\b(?:pink|rose|coral)\b/i);
assert.match(fs.readFileSync(path.join(frontend, "styles.css"), "utf8"), /footer\s*\{[^}]*background:\s*#000000/s);
assert.doesNotMatch(allCss, /font-family:\s*["']?(?!Montserrat|Playfair Display|inherit|var\()[A-Za-z][\w -]*/i);
assert.doesNotMatch(allCss, /Playfair\+Display:ital,wght@0,/);

function resolveApiBase(hostname, origin, configured = "") {
  const context = {
    window: { location: { hostname, origin } },
    document: { querySelector: () => ({ content: configured }) }
  };
  vm.runInNewContext(apiConfig, context);
  return context.window.KAYS_HAVEN_API_URL;
}

assert.equal(resolveApiBase("localhost", "http://localhost:8080"), "http://localhost:8000");
assert.equal(resolveApiBase("127.0.0.1", "http://127.0.0.1:5500"), "http://localhost:8000");
assert.equal(resolveApiBase("", "null"), "http://localhost:8000");
assert.equal(resolveApiBase("shop.example", "https://shop.example"), "https://shop.example");
assert.equal(resolveApiBase("shop.example", "https://shop.example", "https://api.example"), "https://api.example");
const { groupOrdersByCustomer } = require("../src/admin/order-groups");
const customerGroups = groupOrdersByCustomer([
  { id: "5", order_number: "KH-5", customer_name: "Mac Lean", email: "  MACLEAN@example.com ", phone: "+233 24 000 0000", total_amount: 765, status: "Processing", payment_status: "paid", order_items: [{ product_name: "Monsoon Blue Floral Dress", size: "Medium", quantity: 1 }, { product_name: "Socks", quantity: 2 }] },
  { id: "4", order_number: "KH-4", customer_name: "Mac Lean", email: "maclean@example.com", phone: "02400000000", total_amount: 265, status: "Pending", payment_status: "unpaid", order_items: [{ product_name: "Top and Shorts Set", size: "Large", quantity: 1 }] },
  { id: "3", order_number: "KH-3", customer_name: "Mac Lean", email: "maclean@example.com", total_amount: 215, status: "Completed", payment_status: "paid", order_items: [{ product_name: "Little Angel", quantity: 1 }] },
  { id: "9", order_number: "KH-9", customer_name: "Mac Lean", email: "another@example.com", total_amount: 50, status: "Pending", payment_status: "unpaid", order_items: [{ product_name: "Different customer's item", quantity: 1 }] }
]);
assert.equal(customerGroups.length, 2, "customers with matching names but different emails remain separate");
const macLeanGroup = customerGroups.find(group => group.key === "email:maclean@example.com");
assert.ok(macLeanGroup, "normalized email groups Mac Lean's orders together");
assert.equal(macLeanGroup.orders.length, 3, "KH-3, KH-4, and KH-5 remain three separate orders");
assert.equal(macLeanGroup.totalSpent, 1245);
assert.equal(macLeanGroup.orders.find(order => order.order_number === "KH-5").order_items.length, 2, "multiple items stay grouped inside their original order");
assert.equal(macLeanGroup.orders.find(order => order.order_number === "KH-4").payment_status, "unpaid", "payment state stays independent per order");
assert.equal(macLeanGroup.orders.find(order => order.order_number === "KH-3").status, "Completed", "fulfillment state stays independent per order");
const injectedContext = {
  window: { KAYS_HAVEN_API_URL: "https://api.example/", location: { hostname: "shop.example", origin: "https://shop.example" } },
  document: { querySelector: () => ({ content: "" }) }
};
vm.runInNewContext(apiConfig, injectedContext);
assert.equal(injectedContext.window.KAYS_HAVEN_API_URL, "https://api.example");
for (const relativePath of ["index.html", "cart/cart.html", "checkout/checkout.html", "products/product.html", "policies.html"]) {
  const html = fs.readFileSync(path.join(frontend, relativePath), "utf8");
  assert.doesNotMatch(html, /http:\/\/localhost:8000/, `${relativePath} has no hardcoded local API base`);
}
const { buildStaticSite } = require("../deployment/build-static");
assert.throws(() => buildStaticSite(undefined, "http://localhost:8000"), /public HTTPS/);
const previewRoot = fs.mkdtempSync(path.join(os.tmpdir(), "kays-haven-build-test-"));
const previewOutput = path.join(previewRoot, "site");
try {
  const { buildStaticPreview } = require("../deployment/build-static");
  assert.equal(buildStaticPreview(previewOutput), previewOutput);
  for (const required of ["index.html", "shop.html", "landing.css", "brand-system.css", "site-assets/landing-mother-and-baby-clean.png", "product-images/15-pink-baby-layette-bodysuit.png", "cart/cart.html", "checkout/checkout.html", "products/product.html", "policies.html", "admin/index.html"]) {
    assert.equal(fs.existsSync(path.join(previewOutput, required)), true, `built output includes ${required}`);
  }
  for (const [, filename] of verifiedImageEntries) {
    assert.equal(fs.existsSync(path.join(previewOutput, "product-images", filename)), true, `production-style output includes verified image ${filename}`);
  }
  const builtLanding = fs.readFileSync(path.join(previewOutput, "index.html"), "utf8");
  const builtShop = fs.readFileSync(path.join(previewOutput, "shop.html"), "utf8");
  const builtAdmin = fs.readFileSync(path.join(previewOutput, "admin", "index.html"), "utf8");
  assert.match(builtLanding, /href="shop\.html"[^>]*>Enter Shop/);
  assert.match(builtShop, /<span>Quality products<\/span>/);
  assert.equal((builtShop.match(/href="\.\.\/admin\/"/g) || []).length, 2, "built desktop and mobile Login links target the sibling admin directory");
  assert.doesNotMatch(builtShop, /class="hero"|hero-mother-and-baby|id="landing-title"|Enter Shop/);
  assert.match(builtAdmin, /href="\.\.\/shop\.html"/);
  assert.match(builtAdmin, /src="\.\.\/site-assets\/landing-mother-and-baby-clean\.png"/);
  assert.match(fs.readFileSync(path.join(previewOutput, "admin", "app.js"), "utf8"), /productImageUrl\(product, "\.\.\/product-images\/"\)/);
  const builtPages = ["index.html", "shop.html", "cart/cart.html", "checkout/checkout.html", "products/product.html", "policies.html", "admin/index.html"];
  for (const relativePage of builtPages) {
    const pageFile = path.join(previewOutput, relativePage);
    const html = fs.readFileSync(pageFile, "utf8");
    for (const [, rawUrl] of html.matchAll(/\b(?:href|src)="([^"]+)"/g)) {
      if (!rawUrl || /^(?:[a-z]+:|\/\/|#)/i.test(rawUrl)) continue;
      const browserUrl = new URL(rawUrl, `http://preview.local/${relativePage}`);
      const localUrl = decodeURIComponent(browserUrl.pathname).replace(/^\/+/, "");
      if (!localUrl) continue;
      const resolvedPath = path.resolve(previewOutput, localUrl);
      assert.equal(fs.existsSync(resolvedPath), true, `${relativePage} asset/link resolves: ${rawUrl}`);
    }
  }
  assert.throws(() => buildStaticPreview(previewOutput), /already exists/);
} finally {
  fs.rmSync(previewRoot, { recursive: true, force: true });
}

console.log("Frontend assets and checkout wiring passed");
