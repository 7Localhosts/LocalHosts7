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
const storefrontStyles = fs.readFileSync(path.join(frontend, "styles.css"), "utf8");
const checkout = fs.readFileSync(path.join(frontend, "checkout", "checkout.html"), "utf8");
const checkoutScript = fs.readFileSync(path.join(frontend, "checkout", "checkout.js"), "utf8");
const checkoutStyles = fs.readFileSync(path.join(frontend, "checkout", "checkout.css"), "utf8");
const checkoutPaymentButton = require(path.join(frontend, "checkout", "payment-button-state.js"));
const receiptPdf = require(path.join(frontend, "checkout", "receipt-pdf.js"));
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
const cleanProductStart = storefrontScript.indexOf("function cleanPublicProduct(product) {");
const cleanProductEnd = storefrontScript.indexOf("function readPublicCatalogCache()", cleanProductStart);
const cleanProductContext = { cartImageUrl: () => "" };
vm.runInNewContext(`${storefrontScript.slice(cleanProductStart, cleanProductEnd)}; globalThis.clean = cleanPublicProduct;`, cleanProductContext);
const zeroPriceProduct = cleanProductContext.clean({ id: 192, name: "Price review item", category: "Baby care", price: 0, image: null });
assert.equal(zeroPriceProduct.id, 192, "zero-price active products are retained in the public catalogue");
assert.equal(zeroPriceProduct.category, "Baby care", "the original product category is preserved");
assert.equal(zeroPriceProduct.purchasable, false, "invalid-price products are marked non-purchasable");
assert.equal(zeroPriceProduct.price, null, "an invalid amount is not presented as a sale price");
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
assert.match(shop, /class="filter active" data-filter="All" aria-pressed="true"/);
assert.equal((shop.match(/class="category-card[^\"]*" data-category="[^"]+" aria-pressed="false"/g) || []).length, 8, "category buttons start unselected for assistive technology");
for (const category of ["Baby", "Toddler", "Kids", "Teens", "Toys", "Accessories", "Back to School", "Clearance"]) {
  assert.match(shop, new RegExp(`data-category="${category}"`), `shop includes ${category} category`);
}
assert.match(storefrontStyles, /\.category-card\s*\{[^}]*color:\s*var\(--ink\)/s, "category buttons explicitly override native browser text color on desktop and mobile");
assert.doesNotMatch(storefrontStyles.match(/\.category-card\s*\{[^}]*\}/s)?.[0] || "", /color:\s*(?:blue|#(?:00f|0000ff))/i, "category names do not rely on a blue browser default");
const renderProductsStart = storefrontScript.indexOf("function renderProducts() {");
const renderProductsEnd = storefrontScript.indexOf("function saveCart()", renderProductsStart);
assert.ok(renderProductsStart >= 0 && renderProductsEnd > renderProductsStart, "storefront product renderer is available for category regression checks");
const categoryGrid = { innerHTML: "", setAttribute() {}, querySelectorAll: () => [] };
const categoryEmptyState = { textContent: "", style: {} };
const categoryRenderContext = {
  products: [
    { id: "baby-item", name: "Baby item", category: "Baby", price: 20, purchasable: true, _catalogImageUrl: "/baby.webp" },
    { id: "kids-item", name: "Kids item", category: "Kids", price: 30, purchasable: true, _catalogImageUrl: "/kids.webp" }
  ],
  productsLoading: false,
  currentFilter: "Kids",
  $: id => id === "productGrid" ? categoryGrid : categoryEmptyState,
  escapeHtml: value => String(value ?? ""),
  money: amount => `GHS ${Number(amount).toFixed(2)}`,
  cartImageUrl: product => product._catalogImageUrl
};
vm.runInNewContext(`${storefrontScript.slice(renderProductsStart, renderProductsEnd)}; renderProducts();`, categoryRenderContext);
assert.match(categoryGrid.innerHTML, /data-product-card="kids-item"/);
assert.doesNotMatch(categoryGrid.innerHTML, /data-product-card="baby-item"/);
vm.runInNewContext('currentFilter = "Baby"; renderProducts();', categoryRenderContext);
assert.match(categoryGrid.innerHTML, /data-product-card="baby-item"/);
assert.doesNotMatch(categoryGrid.innerHTML, /data-product-card="kids-item"/);
assert.match(categoryGrid.innerHTML, /class="placeholder"/);
assert.match(categoryGrid.innerHTML, /width="800" height="880"/);
const selectionHelper = storefrontScript.match(/function updateCategorySelection\(category\) \{[\s\S]*?^\}/m);
assert.ok(selectionHelper, "category selection helper is defined");
function fakeSelectionButton(dataset) {
  return {
    dataset,
    attributes: {},
    classes: new Set(),
    classList: { toggle(name, selected) { selected ? this.owner.classes.add(name) : this.owner.classes.delete(name); } },
    setAttribute(name, value) { this.attributes[name] = value; }
  };
}
const filterButtons = ["All", "Baby", "Kids"].map(value => fakeSelectionButton({ filter: value }));
const categoryButtons = ["Baby", "Kids"].map(value => fakeSelectionButton({ category: value }));
for (const button of [...filterButtons, ...categoryButtons]) button.classList.owner = button;
const selectionContext = {
  currentFilter: "All",
  document: { querySelectorAll(selector) { return selector === ".filter" ? filterButtons : categoryButtons; } }
};
vm.runInNewContext(`${selectionHelper[0]}; updateCategorySelection("Kids");`, selectionContext);
assert.equal(selectionContext.currentFilter, "Kids");
assert.equal(filterButtons[2].attributes["aria-pressed"], "true", "selected category filter exposes its pressed state");
assert.equal(filterButtons[0].attributes["aria-pressed"], "false", "other filters expose an unselected state");
assert.equal(categoryButtons[1].attributes["aria-pressed"], "true", "the category tile mirrors the selected filter");
vm.runInNewContext("updateCategorySelection('All');", selectionContext);
assert.equal(filterButtons[0].attributes["aria-pressed"], "true", "returning to All resets the accessible filter state");
assert.equal(categoryButtons[1].attributes["aria-pressed"], "false");
assert.match(shop, /id="productGrid"/);
assert.match(shop, /<a class="skip-link" href="#main-content">Skip to main content<\/a>/, "keyboard users can skip repeated storefront navigation");
assert.match(shop, /<main id="main-content" tabindex="-1">/, "the skip link targets a focusable main landmark");
assert.match(storefrontStyles, /\.skip-link:focus\s*\{[^}]*transform:\s*translateY\(0\)/s, "the skip link becomes visible when keyboard-focused");
assert.match(shop, /id="icon-baby"/);
assert.match(shop, /id="icon-school"/);
assert.match(shop, /aria-label="Open shopping cart, 0 items"/);
assert.doesNotMatch(shop, />Cart\s*<span id="cartCount"/);
assert.match(shop, /<svg class="nav-icon" aria-hidden="true"><use href="#icon-info"\/><\/svg>About/);
assert.match(shop, /<svg class="category-icon" aria-hidden="true"><use href="#icon-tag"\/><\/svg>/);
assert.equal((shop.match(/<footer\b/g) || []).length, 1, "the storefront retains its single shared footer");
assert.match(storefrontScript, /const purchasable = Number\.isFinite\(parsedPrice\) && parsedPrice > 0/);
assert.doesNotMatch(storefrontScript, /Out of stock|Maximum available stock reached|stock\s*<=\s*0/i);
assert.match(storefrontScript, /const showBadge = badge && !\/\\bout\\s\+of\\s\+stock\\b\/i\.test\(badge\)/);
assert.doesNotMatch(storefrontScript, /filter\(product => Number\(product\.stock/);
assert.doesNotMatch(cartScript, /stock|Out of Stock/i);
assert.doesNotMatch(checkoutScript, /stock|Out of Stock/i);
assert.match(productScript, /textContent = priceIsValid \? money\(price\) : "Price to be confirmed"/);
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
assert.match(checkout, /src="payment-button-state\.js"><\/script>\s*<script src="receipt-pdf\.js"><\/script>\s*<script src="checkout\.js"><\/script>/);
assert.match(checkout, /src="receipt-pdf\.js"><\/script>/);
assert.match(checkout, /id="receipt-view"[^>]*hidden/);
assert.match(checkout, /id="download-receipt"[^>]*>Download Receipt/);
assert.match(checkout, /id="print-receipt"[^>]*>Print Receipt/);
assert.match(checkoutScript, /fetch\(`\$\{API_URL\}\/receipts\/\$\{encodeURIComponent\(orderId\)\}`/);
assert.match(checkoutScript, /Authorization: `Bearer \$\{accessToken\}`/);
assert.match(checkoutScript, /saveReceiptAccess\(result\.order_id, reference, result\.receipt_access_token\)/);
assert.match(checkoutScript, /String\(receipt\.payment_status \|\| ""\)\.trim\(\)\.toLowerCase\(\) !== "verified paid"/);
assert.doesNotMatch(checkoutScript.slice(checkoutScript.indexOf("function renderVerifiedReceipt"), checkoutScript.indexOf("const RECEIPT_ACCESS_STORAGE_PREFIX")), /localStorage|readCart|window\.location\.search/);
assert.deepEqual(checkoutPaymentButton.buttonPresentation("ready", true), { label: "Pay securely with Paystack", disabled: false });
assert.deepEqual(checkoutPaymentButton.buttonPresentation("connecting", true), { label: "Connecting to Paystack…", disabled: true });
assert.deepEqual(checkoutPaymentButton.buttonPresentation("verifying", true), { label: "Verifying payment…", disabled: true });
assert.deepEqual(checkoutPaymentButton.buttonPresentation("successful", true), { label: "Payment successful", disabled: true });
assert.deepEqual(checkoutPaymentButton.buttonPresentation("verificationFailed", false), { label: "Pay securely with Paystack", disabled: false });
assert.equal(checkoutPaymentButton.actionForReference("KH-existing-reference"), "verify", "retrying a returned Paystack reference must verify the existing payment");
assert.equal(checkoutPaymentButton.actionForReference(""), "initialize");
assert.deepEqual([...new Set(Object.values(checkoutPaymentButton.labels))].sort(), ["Connecting to Paystack…", "Pay securely with Paystack", "Payment successful", "Verifying payment…"].sort());
assert.doesNotMatch(Object.values(checkoutPaymentButton.labels).join(" "), /[✓✔☑]/, "the button does not duplicate the confirmation checkmark");
assert.match(checkout, /product-images\.js/);
assert.match(checkoutScript, /\/payments\/initialize/);
assert.match(checkoutScript, /\/payments\/verify/);
assert.match(checkoutScript, /result\.payment_status !== "paid"/);
assert.match(checkoutScript, /AbortSignal\.timeout\(20000\)/);
assert.match(checkoutScript, /\.noValidate = true/);
assert.match(checkoutScript, /No new order will be created/);
assert.ok(checkoutScript.indexOf('if (paymentButtonState.actionForReference(reference) === "verify")') < checkoutScript.indexOf('fetch(`${API_URL}/payments/initialize`'), "returned references route to verification before payment initialization");
assert.match(checkoutScript, /class="checkout-item-image"/);
assert.match(productPage, /product-images\.js/);
assert.match(shop, /Kay%E2%80%99s%20Haven%20Lavender%20Emblem\.png/);
assert.doesNotMatch(shop, /photo-credit|pexels\.com\/photo\/smiling-mother-and-baby-looking-at-camera-6393377/);
assert.match(landing, /src="site-assets\/landing-mother-and-baby-clean\.png"/);
assert.equal(fs.existsSync(path.join(frontend, "site-assets", "landing-mother-and-baby-clean.png")), true);
assert.match(shop, /rel="icon"[^>]+Kay%E2%80%99s%20Haven%20Lavender%20Emblem\.png/);
assert.equal(fs.existsSync(path.join(frontend, "site-assets", "Kay’s Haven Lavender Emblem.png")), true);
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
assert.doesNotMatch(checkout, /confirmation-view|check-badge|Payment confirmed|conf-name|conf-order-id|Return to the shop/);
assert.match(checkout, /id="view-receipt"[^>]*>View \/ Download Receipt<\/button>/, "the small receipt action sits in checkout without restoring a confirmation card");
assert.match(checkout, /id="receipt-logo"|class="receipt-logo"/);
assert.match(checkout, /receipt-customer-phone|receipt-customer-email|receipt-subtotal-amount/);
assert.match(checkoutScript, /\/payments\/verify/);
assert.match(checkoutScript, /window\.addEventListener\("storage"/);
assert.doesNotMatch(checkoutScript, /checkoutConfigReady|DELIVERY_FEE|shipping_address|delivery_fee/i);
assert.match(checkoutScript, /expected_total: currentCartTotal\(lines\)/);
assert.doesNotMatch(checkoutScript, /imageAvailable !== true/, "missing product photography does not block a valid-price cart item");
assert.match(checkoutScript, /retry-checkout-catalogue/);
assert.match(checkoutScript, /Price unavailable/);
assert.match(cartScript, /refreshCartAvailability\(\)/);
assert.match(cartScript, /cartAvailability\.get\(String\(item\.id\)\) !== true/);
assert.doesNotMatch(checkout, /transport-note|#collection|transport information/i);
assert.match(checkout, /class="kh-brand checkout-brand"/);
assert.match(checkout, /Customer information/);
assert.match(fs.readFileSync(path.join(frontend, "checkout", "checkout.css"), "utf8"), /\.panel h2\s*\{[\s\S]*?font-family: "Montserrat"/);
assert.doesNotMatch(checkoutScript, /confirmation-view|conf-name|conf-order-id/);
assert.doesNotMatch(checkoutStyles, /confirmation-view|check-badge/);
assert.match(checkoutStyles, /#receipt-view\[hidden\]/, "the verified receipt remains independently available after payment");
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
assert.doesNotMatch(adminPage, /Payment Review|orders-payment-issues-rows|payment-review-title/);
assert.match(adminPage, /id="orders-history-rows"[^>]*role="list"/);
assert.match(adminPage, /data-orders-toggle-all="active"[^>]*aria-controls="orders-active-rows"[^>]*aria-expanded="false"/);
assert.match(adminPage, /data-orders-toggle-all="history"[^>]*aria-controls="orders-history-rows"[^>]*aria-expanded="false"/);
assert.match(adminPage, /aria-label="Completed, canceled, and failed-payment orders grouped by customer"/);
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
const classificationStart = adminScript.indexOf("function isHistoryOrder(");
const classificationEnd = adminScript.indexOf("\nfunction toggleOrderCardDetails(", classificationStart);
const classificationContext = {};
assert.ok(classificationStart >= 0 && classificationEnd > classificationStart, "order section classification helpers are defined");
vm.runInNewContext(`${adminScript.slice(classificationStart, classificationEnd)}\nglobalThis.isHistory = isHistoryOrder; globalThis.isPaymentIssue = isPaymentIssueOrder; globalThis.isActiveFulfillment = isActiveFulfillmentOrder; globalThis.canComplete = canCompleteOrder; globalThis.orderStatusActions = orderStatusActions; globalThis.orderHistoryStatus = orderHistoryStatus;`, classificationContext);
const pendingUnpaidOrder = { status: "Pending", payment_status: "pending" };
const paymentFailedOrder = { status: "Payment setup failed", payment_status: "failed" };
const completedOrder = { status: "Completed", payment_status: "paid" };
const canceledOrder = { status: "Canceled", payment_status: "failed" };
assert.equal(classificationContext.isActiveFulfillment(pendingUnpaidOrder), true, "pending orders remain in Active Orders");
assert.equal(classificationContext.isPaymentIssue(paymentFailedOrder), true, "failed payment attempts remain identifiable");
assert.equal(classificationContext.isActiveFulfillment(paymentFailedOrder), false, "failed payments are excluded from active fulfilment");
assert.equal(classificationContext.isHistory(paymentFailedOrder), true, "failed-payment records appear in Order History");
assert.equal(classificationContext.orderHistoryStatus(paymentFailedOrder), "Payment setup failed", "history preserves the actual failed-payment order status");
assert.equal(classificationContext.orderHistoryStatus({ status: "Pending", payment_status: "failed" }), "failed", "a failed payment is not mislabeled Completed or Canceled");
assert.equal(classificationContext.isHistory(completedOrder), true, "completed orders remain in history");
assert.equal(classificationContext.isHistory(canceledOrder), true, "canceled unpaid orders remain in history");
assert.equal(classificationContext.canComplete(pendingUnpaidOrder), false, "the UI cannot offer completion for an unpaid order");
assert.equal(classificationContext.canComplete({ status: "Pending", payment_status: "PAID" }), true, "verified paid orders may be completed regardless of status casing");
assert.equal(classificationContext.canComplete({ status: "Pending", payment_status: " paid " }), true, "whitespace around a verified paid status is normalized");
for (const paymentStatus of ["pending", "unpaid", "failed", "success", "successful", "", null, undefined]) {
  assert.equal(classificationContext.canComplete({ status: "Pending", payment_status: paymentStatus }), false, `${String(paymentStatus)} is not proof of verified payment`);
}
assert.equal(classificationContext.isPaymentIssue(paymentFailedOrder), true, "payment failures remain identifiable in history");
assert.deepEqual(Array.from(classificationContext.orderStatusActions({ payment_status: "paid" }, false, false), action => action[1]), ["Complete Order", "Cancel Order"], "verified paid active orders display both completion and cancellation actions");
assert.deepEqual(Array.from(classificationContext.orderStatusActions(pendingUnpaidOrder, false, false), action => action[1]), ["Cancel Order"], "unpaid active orders cannot be completed but remain cancelable");
assert.deepEqual(Array.from(classificationContext.orderStatusActions(paymentFailedOrder, true)), [], "failed-payment history records expose no completion or cancellation actions");
assert.deepEqual(Array.from(classificationContext.orderStatusActions(completedOrder, true, false)), [], "history cards do not expose active-order controls");
assert.match(adminScript, /function isHistoryOrder\(order\)/);
assert.match(adminScript, /function isPaymentIssueOrder\(order\)/);
assert.match(adminScript, /function isActiveFulfillmentOrder\(order\)/);
assert.match(adminScript, /function canCompleteOrder\(order\)/);
assert.match(adminScript, /function orderStatusActions\(order, historical\)/);
assert.match(adminScript, /const availableActions = orderStatusActions\(order, historical\)/);
assert.match(adminScript, /const historyMatches = orders\.filter\(isHistoryOrder\)/);
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
assert.doesNotMatch(adminScript, /orders-payment-issues-rows|payment review/);
assert.match(adminScript, /Completed, canceled, and failed-payment orders will appear here/);
assert.match(adminScript, /count\.textContent = `\$\{activeCount\} active · \$\{historyCount\} in history`/);
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
assert.match(backendSource, /archive_catalogue_product/);
assert.match(backendSource, /createGuestPaystackEmail/);
assert.match(backendSource, /email: email \|\| null/);
assert.match(backendSource, /sizes: \[\.\.\.new Set\(sizes\.map/);
assert.doesNotMatch(backendSource, /shipping_address:/);
const checkoutHtml = fs.readFileSync(path.join(frontend, "checkout", "checkout.html"), "utf8");
assert.match(checkoutHtml, /id="email" name="email" type="email" autocomplete="email" aria-describedby="email-help"/);
assert.doesNotMatch(checkoutHtml, /id="email"[^>]*required/);
assert.match(checkoutHtml, /Email address \(optional\)/);
assert.match(fs.readFileSync(path.join(root, "supabase", "migrations", "202610150001_optional_guest_checkout_and_product_visibility.sql"), "utf8"), /alter column email drop not null[\s\S]*?add column if not exists is_active[\s\S]*?delete_product_without_orders/);
assert.doesNotMatch(storefrontScript, /productsWithLoadedImages|productImageLoads\(imageUrl\)/, "catalogue cards no longer wait on each image and append progressively");
assert.match(storefrontScript, /PUBLIC_CATALOG_STORAGE_KEY/);
assert.match(storefrontScript, /kayshaven-public-catalog-v2/);
assert.match(storefrontScript, /PUBLIC_CATALOG_STALE_LIMIT_MS = 2 \* 60 \* 1000/);
assert.match(storefrontScript, /cache: "no-store"/);
assert.match(storefrontScript, /ensureCategoryFilters\(products\)/, "API categories omitted from the original filter list get their own filter");
assert.match(storefrontScript, /Price to be confirmed/);
assert.match(storefrontScript, /This item is unavailable until its price is confirmed/);
assert.match(storefrontScript, /renderProductSkeletons/);
assert.match(storefrontScript, /setAttribute\("aria-busy", String\(productsLoading\)\)/);
assert.doesNotMatch(storefrontScript, /products = products\.filter/, "an image error preserves the card and its layout slot");
assert.match(storefrontStyles, /\.product-image\[data-image-state="loaded"\] \.placeholder/);
assert.match(storefrontStyles, /\.product-card-skeleton/);
assert.doesNotMatch(fs.readFileSync(path.join(frontend, "script.js"), "utf8"), /placeholder.*Product image unavailable/);
assert.match(fs.readFileSync(path.join(frontend, "product-images.js"), "utf8"), /productImageLoads/);
assert.doesNotMatch(productScript, /await productImageLoads|disabled = true/, "a missing product image never disables a valid product's purchase button");
assert.match(productScript, /Price to be confirmed/);
assert.doesNotMatch(cartScript, /productImageLoads\(/, "cart availability is based on live product and price data, not photography");
assert.match(adminScript, /This active product cannot be purchased until its price is corrected/);
assert.match(adminScript, /Needs correction/);
assert.match(adminScript, /function restoreStaffSession\(\)/);
assert.doesNotMatch(adminScript, /sessionStorage\.setItem\("kayshaven-access-token"/);
assert.match(adminScript, /Never restore staff credentials from browser storage/);
assert.doesNotMatch(adminScript, /window\.confirm\(`Permanently delete/);
assert.match(backendSource, /restore_catalogue_product/);
assert.match(adminStyles, /\.sidebar\s*\{[^}]*position:\s*sticky/s);
assert.match(adminStyles, /\.metric\s*>\s*strong\s*\{[^}]*var\(--kh-brand-haven-color/s);
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
assert.match(backendSource, /buildPaystackInitializationPayload\(\{/);
assert.match(backendSource, /amount: String\(Math\.round\(Number\(totalAmount\) \* 100\)\)/);
assert.match(backendSource, /payment_status: "paid", order_id: order\.id/);
assert.match(backendSource, /metadata: JSON\.stringify\(/);
assert.match(backendSource, /failureStage = "product_lookup"/);
assert.match(backendSource, /failureStage = "order_insert"/);
assert.match(backendSource, /failureStage = "order_item_insert"/);
assert.match(backendSource, /failureStage = "paystack_initialize"/);
assert.match(backendSource, /formatPaymentInitializationFailure\(failureStage, error\)/);
assert.doesNotMatch(backendSource, /console\.error\(error\.message\)|console\.error\(JSON\.stringify\(\{[^}]*customerName/);
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
assert.equal(
  resolveApiBase("radiant-croissant-02f4a0.netlify.app", "https://radiant-croissant-02f4a0.netlify.app"),
  "https://kays-haven-backend.onrender.com",
  "the deployed Netlify storefront defaults to the Render API"
);
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
assert.throws(() => buildStaticSite(undefined, "https://api.example", "https://user:password@pages.example"), /exact public HTTPS origin/);
assert.throws(() => buildStaticSite(undefined, "https://api.example", "https://pages.example/preview"), /exact public HTTPS origin/);
const netlifyConfig = fs.readFileSync(path.join(root, "netlify.toml"), "utf8");
assert.match(netlifyConfig, /base\s*=\s*"\."/);
assert.match(netlifyConfig, /command\s*=\s*"cd src\/backend && npm ci && npm run build:static"/);
assert.match(netlifyConfig, /publish\s*=\s*"dist"/);
const previewRoot = fs.mkdtempSync(path.join(os.tmpdir(), "kays-haven-build-test-"));
const previewOutput = path.join(previewRoot, "site");
try {
  const { buildStaticPreview } = require("../deployment/build-static");
  assert.equal(buildStaticPreview(previewOutput, "https://kays-haven-temp.pages.dev"), previewOutput);
  const builtHeaders = fs.readFileSync(path.join(previewOutput, "_headers"), "utf8");
  assert.match(builtHeaders, /Access-Control-Allow-Origin: https:\/\/kays-haven-temp\.pages\.dev/);
  assert.doesNotMatch(builtHeaders, /Access-Control-Allow-Origin:\s*\*/);
  assert.match(builtHeaders, /X-Frame-Options: DENY/);
  for (const required of ["index.html", "shop.html", "landing.css", "brand-system.css", "site-assets/landing-mother-and-baby-clean.png", "product-images/15-pink-baby-layette-bodysuit.png", "cart/cart.html", "checkout/checkout.html", "checkout/payment-button-state.js", "checkout/receipt-pdf.js", "products/product.html", "policies.html", "admin/index.html"]) {
    assert.equal(fs.existsSync(path.join(previewOutput, required)), true, `built output includes ${required}`);
  }
  for (const [, filename] of verifiedImageEntries) {
    assert.equal(fs.existsSync(path.join(previewOutput, "product-images", filename)), true, `production-style output includes verified image ${filename}`);
  }
  const builtLanding = fs.readFileSync(path.join(previewOutput, "index.html"), "utf8");
  const builtShop = fs.readFileSync(path.join(previewOutput, "shop.html"), "utf8");
  const builtAdmin = fs.readFileSync(path.join(previewOutput, "admin", "index.html"), "utf8");
  const builtCheckout = fs.readFileSync(path.join(previewOutput, "checkout", "checkout.html"), "utf8");
  assert.match(builtLanding, /href="shop\.html"[^>]*>Enter Shop/);
  assert.match(builtShop, /<span>Quality products<\/span>/);
  assert.equal((builtShop.match(/href="\.\.\/admin\/"/g) || []).length, 2, "built desktop and mobile Login links target the sibling admin directory");
  assert.doesNotMatch(builtShop, /class="hero"|hero-mother-and-baby|id="landing-title"|Enter Shop/);
  assert.match(builtAdmin, /href="\.\.\/shop\.html"/);
  assert.match(builtAdmin, /src="\.\.\/site-assets\/landing-mother-and-baby-clean\.png"/);
  assert.match(builtCheckout, /src="payment-button-state\.js"><\/script>\s*<script src="receipt-pdf\.js"><\/script>\s*<script src="checkout\.js"><\/script>/, "the production-style build includes checkout helpers before checkout logic");
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

const productionOutput = buildStaticSite(undefined, "https://kays-haven-backend.onrender.com", "https://kayshaven.live");
assert.equal(productionOutput, path.join(root, "dist"));
const productionHeaders = fs.readFileSync(path.join(productionOutput, "_headers"), "utf8");
assert.match(productionHeaders, /Access-Control-Allow-Origin: https:\/\/kayshaven\.live/);
  const productionAdminFiles = [
  "admin/index.html",
  "admin/app.js",
  "admin/styles.css",
  "admin/order-groups.js",
  "api-config.js",
  "product-images.js",
  "brand-system.css",
  "site-assets/landing-mother-and-baby-clean.png",
  "site-assets/Kay’s Haven Lavender Emblem.png",
  "product-images/15-pink-baby-layette-bodysuit.png"
];
for (const required of productionAdminFiles) {
  assert.equal(fs.existsSync(path.join(productionOutput, required)), true, `production dist includes ${required}`);
}
const productionAdmin = fs.readFileSync(path.join(productionOutput, "admin", "index.html"), "utf8");
assert.match(productionAdmin, /<meta name="api-base" content="https:\/\/kays-haven-backend\.onrender\.com">/);
for (const [, rawUrl] of productionAdmin.matchAll(/\b(?:href|src)="([^"]+)"/g)) {
  if (!rawUrl || /^(?:[a-z]+:|\/\/|#)/i.test(rawUrl)) continue;
  const browserUrl = new URL(rawUrl, "https://shop.example/admin/index.html");
  const localUrl = decodeURIComponent(browserUrl.pathname).replace(/^\/+/, "");
  if (localUrl) assert.equal(fs.existsSync(path.join(productionOutput, localUrl)), true, `production admin reference resolves: ${rawUrl}`);
}

async function exercisePaymentVerification(responseFactory) {
  const button = { textContent: "", disabled: false };
  const message = { textContent: "", classList: { add() {}, remove() {} } };
  const checkoutView = { hidden: false };
  const receiptActions = { disabled: true, addEventListener() {} };
  const removed = [];
  const replaced = [];
  const receiptLoads = [];
  let observedWhilePending = "";
  const context = {
    API_URL: "https://api.example.test/api",
    checkoutPaymentState: "ready",
    paymentVerificationPending: false,
    paymentButtonState: checkoutPaymentButton,
    loadVerifiedReceipt: async (...args) => receiptLoads.push(args),
    saveReceiptAccess: (...args) => ({ order_id: String(args[0]), reference: args[1], access_token: args[2] }),
    showReceiptAction() {},
    getPricedLines: () => [],
    cartValidationError: () => "",
    document: { getElementById(id) {
      return ({
        "place-order-btn": button,
        "checkout-message": message,
        "checkout-view": checkoutView,
        "download-receipt": receiptActions,
        "print-receipt": receiptActions
      })[id];
    } },
    AbortSignal: { timeout: () => "synthetic-timeout" },
    fetch: async (...args) => {
      observedWhilePending = button.textContent;
      return responseFactory(...args);
    },
    localStorage: { removeItem: key => removed.push(key), setItem() {} },
    history: { replaceState: (...args) => replaced.push(args) },
    URL,
    window: { location: { pathname: "/checkout/checkout.html", href: "https://kayshaven.live/checkout/checkout.html?reference=KH-existing-reference" } }
  };
  const buttonHelpersStart = checkoutScript.indexOf("function syncPaymentButton(");
  const buttonHelpersEnd = checkoutScript.indexOf("function formatReceiptDate(", buttonHelpersStart);
  const verifyStart = checkoutScript.indexOf("async function verifyPaymentReference(");
  const verifyEnd = checkoutScript.indexOf("\nasync function verifyReturnedPayment(", verifyStart);
  assert.ok(buttonHelpersStart >= 0 && buttonHelpersEnd > buttonHelpersStart);
  assert.ok(verifyStart >= 0 && verifyEnd > verifyStart);
  vm.runInNewContext(`${checkoutScript.slice(buttonHelpersStart, buttonHelpersEnd)}\n${checkoutScript.slice(verifyStart, verifyEnd)}\nglobalThis.verifyPaymentReference = verifyPaymentReference;`, context);
  button.textContent = checkoutPaymentButton.buttonPresentation("ready", true).label;
  await context.verifyPaymentReference("KH-existing-reference");
  return { button, checkoutView, message, removed, replaced, receiptLoads, observedWhilePending, context };
}

async function testPaymentVerificationButtonStates() {
  const pending = await exercisePaymentVerification(async () => ({
    ok: true,
    json: async () => ({ success: false, payment_status: "pending", error: "Payment is not confirmed yet." })
  }));
  assert.equal(pending.observedWhilePending, "Verifying payment…", "the button shows the pending verification state during the API request");
  assert.equal(pending.button.textContent, "Pay securely with Paystack", "an unconfirmed payment returns to the retry label");
  assert.equal(pending.button.disabled, false, "pending verification can be retried");
  assert.match(pending.message.textContent, /No new order will be created/);
  assert.deepEqual(pending.removed, [], "an unconfirmed payment does not clear the cart");

  const successful = await exercisePaymentVerification(async () => ({
    ok: true,
    json: async () => ({ success: true, payment_status: "paid", order_id: "synthetic-order-1", receipt_access_token: "synthetic-signed-token" })
  }));
  assert.equal(successful.observedWhilePending, "Verifying payment…");
  assert.equal(successful.button.textContent, "Payment successful", "the success label requires backend confirmation as paid");
  assert.equal(successful.button.disabled, true, "a successful payment cannot be submitted again");
  assert.equal(successful.checkoutView.hidden, false, "the existing checkout remains visible with its successful payment button");
  assert.deepEqual(successful.receiptLoads, [["synthetic-order-1", "synthetic-signed-token"]], "the receipt uses the order ID and access token returned only after backend verification");
  assert.deepEqual(successful.removed, ["kayshaven-cart"]);
  assert.equal(successful.replaced.length, 1);

  const failed = await exercisePaymentVerification(async () => ({
    ok: false,
    json: async () => ({ error: "Payment could not be verified right now." })
  }));
  assert.equal(failed.observedWhilePending, "Verifying payment…");
  assert.equal(failed.button.textContent, "Pay securely with Paystack");
  assert.equal(failed.button.disabled, false, "failed verification leaves the same reference retryable");
  assert.match(failed.message.textContent, /reference KH-existing-reference/);
  assert.deepEqual(failed.removed, [], "failed verification preserves the cart");

  const timeout = await exercisePaymentVerification(async () => {
    const error = new Error("request timed out");
    error.name = "TimeoutError";
    throw error;
  });
  assert.match(timeout.message.textContent, /Payment verification timed out/);
  assert.equal(timeout.button.disabled, false, "a verification timeout can be retried");
}

async function testReceiptAccessRefresh() {
  const restoreStart = checkoutScript.indexOf("async function restoreStoredReceipt(");
  const restoreEnd = checkoutScript.indexOf('\ndocument.getElementById("view-receipt").addEventListener', restoreStart);
  assert.ok(restoreStart >= 0 && restoreEnd > restoreStart, "refresh restoration logic is available for direct testing");
  const savedAccess = { order_id: "paid-order-9", reference: "KH-PAID-REFERENCE-9", access_token: "expired-token" };
  const storage = {
    getItem(key) {
      if (key === "kayshaven-last-receipt-order") return savedAccess.order_id;
      if (key === `kayshaven-receipt-access:${savedAccess.order_id}`) return JSON.stringify(savedAccess);
      return null;
    },
    setItem() {}
  };
  const restored = { actions: 0, receiptLoads: [], paymentState: "" };
  const context = {
    API_URL: "https://api.example.test/api",
    LAST_RECEIPT_ORDER_STORAGE_KEY: "kayshaven-last-receipt-order",
    RECEIPT_ACCESS_STORAGE_PREFIX: "kayshaven-receipt-access:",
    localStorage: storage,
    readCart: () => [],
    readReceiptAccess: () => savedAccess,
    AbortSignal: { timeout: () => "synthetic-timeout" },
    fetch: async (url, options) => {
      assert.equal(url, "https://api.example.test/api/payments/verify");
      assert.equal(JSON.parse(options.body).reference, savedAccess.reference, "refresh uses the stored unguessable payment reference, never an order number alone");
      return { ok: true, json: async () => ({ success: true, payment_status: "paid", order_id: savedAccess.order_id, receipt_access_token: "fresh-signed-token" }) };
    },
    saveReceiptAccess: (orderId, reference, token) => ({ order_id: orderId, reference, access_token: token }),
    showReceiptAction() { restored.actions += 1; },
    setCheckoutPaymentState(state) { restored.paymentState = state; },
    loadVerifiedReceipt: async (...args) => restored.receiptLoads.push(args),
    document: { getElementById: () => ({ textContent: "" }) }
  };
  vm.runInNewContext(`${checkoutScript.slice(restoreStart, restoreEnd)}\nglobalThis.restoreReceipt = restoreStoredReceipt;`, context);
  await context.restoreReceipt();
  assert.equal(restored.actions, 1, "the receipt action returns after backend re-verification");
  assert.equal(restored.paymentState, "successful");
  assert.deepEqual(restored.receiptLoads, [[savedAccess.order_id, "fresh-signed-token"]], "an expired bearer token is renewed only through backend payment verification");

  const rejected = { actions: 0, receiptLoads: [] };
  context.fetch = async () => ({ ok: false, json: async () => ({ success: false, payment_status: "pending" }) });
  context.showReceiptAction = () => { rejected.actions += 1; };
  context.loadVerifiedReceipt = async (...args) => rejected.receiptLoads.push(args);
  await context.restoreReceipt();
  assert.equal(rejected.actions, 0, "an unverified payment never reveals the receipt action after refresh");
  assert.deepEqual(rejected.receiptLoads, []);
}

async function testReceiptPdf() {
  const paidReceipt = {
    verified: true,
    order_number: "KH-RECEIPT-1",
    purchase_date: "2026-10-22T12:00:00.000Z",
    customer_name: "Synthetic Buyer",
    payment_status: "VERIFIED PAID",
    payment_method: "Paystack",
    payment_reference: "KH-REFERENCE-1",
    subtotal: 42.5,
    total_amount: 42.5,
    email: "private@example.test",
    phone: "+233000000000",
    items: [
      { product_name: "Cotton top", image_url: "https://kayshaven.live/product-images/cotton-top.png", size: "M", quantity: 2, unit_price: 20, line_total: 40 },
      { product_name: "Toy", image_url: "https://kayshaven.live/product-images/toy.png", size: "N/A", quantity: 1, unit_price: 2.5, line_total: 2.5 }
    ]
  };
  const drawnText = [];
  let drawnImageCount = 0;
  const context = {
    scale() {}, fillRect() {}, strokeRect() {}, beginPath() {}, moveTo() {}, lineTo() {}, stroke() {}, drawImage() { drawnImageCount += 1; },
    fillText(text) { drawnText.push(String(text)); },
    measureText(text) { return { width: String(text).length * 6 }; }
  };
  const pdfEnvironment = {
    Blob,
    Image: class TestImage {
      naturalWidth = 100;
      naturalHeight = 100;
      complete = true;
      set src(value) { this._src = value; }
    },
    location: { origin: "https://kayshaven.live", href: "https://kayshaven.live/checkout/checkout.html" },
    document: {
      baseURI: "https://kayshaven.live/checkout/checkout.html",
      fonts: { ready: Promise.resolve(), load: async () => [] },
      createElement() {
        return {
          width: 0, height: 0,
          getContext: () => context,
          toBlob(callback, type) { callback(new Blob([new Uint8Array([0xff, 0xd8, 0xff, 0xd9])], { type })); }
        };
      }
    }
  };
  const pdfReceipt = {
    ...paidReceipt,
    subtotal: 63.5,
    total_amount: 63.5,
    items: [
      ...paidReceipt.items,
      { product_name: "School shoes", image_url: "https://kayshaven.live/product-images/shoes.png", size: "3", quantity: 1, unit_price: 10, line_total: 10 },
      { product_name: "Blue hat", image_url: "https://kayshaven.live/product-images/hat.png", size: "One size", quantity: 1, unit_price: 5, line_total: 5 },
      { product_name: "School bag", image_url: "https://kayshaven.live/product-images/bag.png", size: "N/A", quantity: 1, unit_price: 6, line_total: 6 }
    ]
  };
  const pdf = await receiptPdf.createReceiptPdf(pdfReceipt, pdfEnvironment);
  assert.equal(pdf.type, "application/pdf", "Download Receipt creates a PDF blob");
  const pdfBuffer = new Uint8Array(await pdf.arrayBuffer());
  const pdfText = new TextDecoder("latin1").decode(pdfBuffer);
  assert.match(pdfText, /^%PDF-1\.4/);
  assert.match(pdfText, /\/Filter \/DCTDecode/, "the downloadable PDF embeds rendered, branded page images");
  assert.match(pdfText, /\/Count 2/, "long receipts paginate instead of clipping later order items");
  assert.ok(drawnImageCount >= 7, "the PDF draws the logo and each saved product image on its receipt page");
  const xrefOffset = Number(pdfText.match(/startxref\n(\d+)/)?.[1]);
  assert.equal(pdfText.slice(xrefOffset, xrefOffset + 4), "xref", "the generated PDF has a valid cross-reference offset");
  for (const detail of ["Kay's", "Haven", "Quality products from crib to campus.", "VERIFIED PAID", "Cotton top", "Size: M", "Quantity: 2", "GH₵ 20.00", "GH₵ 40.00", "Subtotal", "GH₵ 63.50", "private@example.test", "+233000000000", "KH-REFERENCE-1"]) {
    assert.ok(drawnText.some(line => line.includes(detail)), `branded receipt layout includes backend receipt detail: ${detail}`);
  }
  assert.throws(() => receiptPdf.validateVerifiedReceipt({ ...paidReceipt, payment_status: "failed" }), /backend-verified paid order/i, "failed payments cannot produce a paid receipt PDF");
  assert.throws(() => receiptPdf.validateVerifiedReceipt({ ...paidReceipt, verified: false }), /backend-verified paid order/i, "frontend status alone cannot authorize a receipt");
  assert.throws(() => receiptPdf.validateVerifiedReceipt({ ...paidReceipt, total_amount: 99 }), /totals do not match/i, "incorrect or mutated order totals cannot be receipted");

  const receiptElements = new Map();
  const makeElement = () => ({
    textContent: "",
    className: "",
    hidden: false,
    disabled: true,
    children: [],
    append(...children) { this.children.push(...children); },
    appendChild(child) { this.children.push(child); },
    replaceChildren(...children) { this.children = children; },
    addEventListener() {},
    setAttribute(name, value) { this[name] = value; },
    replaceWith(replacement) { this.replacement = replacement; }
  });
  const renderContext = {
    Date,
    money: amount => `GH₵ ${Number(amount).toFixed(2)}`,
    document: {
      getElementById(id) {
        if (!receiptElements.has(id)) receiptElements.set(id, makeElement());
        return receiptElements.get(id);
      },
      createElement: makeElement
    }
  };
  const renderStart = checkoutScript.indexOf("function formatReceiptDate(");
  const renderEnd = checkoutScript.indexOf("\nconst RECEIPT_ACCESS_STORAGE_PREFIX", renderStart);
  assert.ok(renderStart >= 0 && renderEnd > renderStart, "verified receipt renderer is defined without handling its access token");
  vm.runInNewContext(`${checkoutScript.slice(renderStart, renderEnd)}\nglobalThis.renderReceipt = renderVerifiedReceipt;`, renderContext);
  renderContext.renderReceipt(paidReceipt);
  assert.equal(receiptElements.get("receipt-view").hidden, true, "the receipt stays collapsed until the customer selects its action");
  assert.equal(receiptElements.get("receipt-order-number").textContent, "KH-RECEIPT-1");
  assert.equal(receiptElements.get("receipt-payment-status").textContent, "VERIFIED PAID");
  assert.equal(receiptElements.get("receipt-total-amount").textContent, "GH₵ 42.50");
  assert.equal(receiptElements.get("receipt-subtotal-amount").textContent, "GH₵ 42.50");
  assert.equal(receiptElements.get("receipt-items").children.length, 2);
  assert.equal(receiptElements.get("receipt-items").children[0].children[1].children[0].textContent, "Cotton top");
  assert.equal(receiptElements.get("download-receipt").disabled, false);
  assert.equal(receiptElements.get("print-receipt").disabled, false);
  assert.throws(() => renderContext.renderReceipt({ ...paidReceipt, payment_status: "failed" }), /only after payment is verified/i, "failed payment data is rejected by the receipt renderer");
}

testPaymentVerificationButtonStates().then(testReceiptAccessRefresh).then(testReceiptPdf).then(() => {
  console.log("Frontend assets, checkout verification states, and receipt PDF checks passed");
}).catch(error => {
  console.error(error);
  process.exitCode = 1;
});

// History is relocated once and initially collapsed; search remains available inside Overview.
const overviewMarkup = adminPage.slice(adminPage.indexOf('id="view-overview"'), adminPage.indexOf('<!-- ORDERS -->'));
assert.match(overviewMarkup, /id="overview-order-history" hidden/);
assert.match(overviewMarkup, /View Order History/);
assert.match(overviewMarkup, /id="history-search-input"/);
assert.equal((adminPage.match(/id="orders-history-rows"/g) || []).length, 1);
assert.match(adminPage, /class="orders-refresh-control">[\s\S]*?id="refresh-orders"[\s\S]*?<small id="orders-refreshed-at"/);
assert.match(adminScript, /actions.appendChild\(deleteButton\)/);
assert.match(adminScript, /<svg width="18"/);
