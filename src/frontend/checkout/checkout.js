const API_URL = `${window.KAYS_HAVEN_API_URL}/api`;
let checkoutProducts = new Map();
let checkoutCatalogueReady = false;
let checkoutCatalogueError = "";

function readCart() {
  try {
    const cart = JSON.parse(localStorage.getItem("kayshaven-cart") || "[]");
    return Array.isArray(cart) ? cart.filter(item => item && (item.id ?? item.product_id)) : [];
  } catch {
    return [];
  }
}

const money = amount => `GHS ${Number(amount || 0).toFixed(2)}`;
const escapeHtml = value => String(value ?? "").replace(/[&<>"']/g, char => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
})[char]);

function getPricedLines() {
  return readCart().map(item => {
    const productId = item.id ?? item.product_id;
    const product = checkoutProducts.get(String(productId));
    const quantity = Number(item.qty ?? item.quantity ?? 0);
    return { item, product, quantity, unitPrice: Number(product?.price) };
  });
}

function cartValidationError(lines) {
  if (checkoutCatalogueError) return checkoutCatalogueError;
  if (!checkoutCatalogueReady) return "Checking current product prices…";
  for (const line of lines) {
    if (!line.product) return "A product in your cart is no longer available. Return to the shop to update your cart.";
    if (line.product.imageAvailable !== true) return `${line.product.name} does not have a working product image and cannot be checked out. Remove it from your cart.`;
    if (!Number.isInteger(line.quantity) || line.quantity < 1) return "Check the quantity for each item in your cart.";
    if (!Number.isFinite(line.unitPrice) || line.unitPrice <= 0) return `${line.product.name} is currently unavailable for checkout.`;
    const sizes = productSizeOptions(line.product);
    const selectedSize = String(line.item.size || "").trim();
    if (sizes.length && (!selectedSize || !sizes.includes(selectedSize))) return `Choose an available size for ${line.product.name} from its product page.`;
    if (!sizes.length && selectedSize) return `${line.product.name} no longer has size options. Remove it from your cart and add it again.`;
  }
  return "";
}

function currentCartTotal(lines = getPricedLines()) {
  const subtotal = lines.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0);
  return Math.round((subtotal + Number.EPSILON) * 100) / 100;
}

function renderOrderSummary() {
  const lines = getPricedLines();
  const container = document.getElementById("order-items");
  const message = document.getElementById("checkout-price-message");
  const items = lines.map(({ item, product, quantity, unitPrice }) => {
    const image = product ? productImageUrl(product, "../images/") : "";
    const imageMarkup = image && product?.imageAvailable
      ? `<img class="checkout-item-image" data-checkout-product-id="${escapeHtml(product.id)}" src="${escapeHtml(image)}" alt="" loading="lazy">`
      : "";
    const name = product?.name || item.name || item.product_name || "Product";
    const displayPrice = checkoutCatalogueReady && product && Number.isFinite(unitPrice) ? money(unitPrice * quantity) : "Checking price…";
    return `<div class="order-item">${imageMarkup}<div class="order-item-details"><div class="name">${escapeHtml(name)}</div><div class="qty">Qty: ${quantity}${item.size ? ` · Size: ${escapeHtml(item.size)}` : ""}</div></div><div>${displayPrice}</div></div>`;
  });
  container.innerHTML = items.length ? items.join("") : "<p>Your cart is empty. <a href=\"../shop.html#shop\">Continue shopping</a>.</p>";
  container.querySelectorAll("[data-checkout-product-id]").forEach(image => image.addEventListener("error", () => {
    const product = checkoutProducts.get(String(image.dataset.checkoutProductId));
    if (!product || !product.imageAvailable) return;
    product.imageAvailable = false;
    renderOrderSummary();
  }, { once: true }));

  const total = checkoutCatalogueReady ? currentCartTotal(lines) : null;
  document.getElementById("summary-total").textContent = total == null ? "Checking prices…" : money(total);
  const validation = lines.length ? cartValidationError(lines) : "";
  message.textContent = validation;
  message.classList.toggle("is-error", Boolean(checkoutCatalogueError || (checkoutCatalogueReady && validation)));
  document.getElementById("place-order-btn").disabled = !lines.length || !checkoutCatalogueReady || Boolean(validation);
}

async function loadCheckoutCatalogue() {
  try {
    const response = await fetch(`${API_URL}/products`);
    const result = await response.json();
    if (!response.ok || !Array.isArray(result.products)) throw new Error(result.error || "Current product prices are unavailable. Please try again shortly.");
    checkoutProducts = new Map(result.products.map(product => [String(product.id), product]));
    const cartIds = new Set(readCart().map(item => String(item.id ?? item.product_id)));
    await Promise.all([...cartIds].map(async id => {
      const product = checkoutProducts.get(id);
      if (!product) return;
      const image = productImageUrl(product, "../images/");
      const absoluteImage = image ? new URL(image, window.location.href).href : "";
      product.imageAvailable = await productImageLoads(absoluteImage);
    }));
    checkoutCatalogueReady = true;
    checkoutCatalogueError = "";
    const cachedCart = readCart();
    let cartPricesChanged = false;
    cachedCart.forEach(item => {
      const product = checkoutProducts.get(String(item.id ?? item.product_id));
      if (product && Number(item.price) !== Number(product.price)) {
        item.price = Number(product.price);
        cartPricesChanged = true;
      }
      if (product?.imageAvailable) item.image = product.image || productImageUrl(product, "../images/");
    });
    if (cartPricesChanged) localStorage.setItem("kayshaven-cart", JSON.stringify(cachedCart));
    renderOrderSummary();
  } catch (error) {
    checkoutCatalogueError = error.message || "Current product prices are unavailable. Please try again shortly.";
    renderOrderSummary();
  }
}

async function verifyReturnedPayment() {
  const params = new URLSearchParams(window.location.search);
  const reference = params.get("reference");
  if (!reference) return;
  const button = document.getElementById("place-order-btn");
  button.disabled = true;
  button.textContent = "Verifying payment…";
  try {
    const response = await fetch(`${API_URL}/payments/verify`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reference })
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Payment could not be verified.");
    document.getElementById("conf-name").textContent = result.customer_name || "";
    document.getElementById("conf-order-id").textContent = `Order #${result.order_number || result.order_id}`;
    document.getElementById("checkout-view").hidden = true;
    document.getElementById("confirmation-view").hidden = false;
    localStorage.removeItem("kayshaven-cart");
    history.replaceState({}, "", window.location.pathname);
  } catch (error) {
    const message = document.getElementById("checkout-message");
    message.textContent = `${error.message} If you were charged, contact us with reference ${reference}.`;
    message.classList.add("is-error");
    button.disabled = false;
    button.textContent = "Pay securely with Paystack";
  }
}

document.getElementById("checkout-form").addEventListener("submit", async event => {
  event.preventDefault();
  const cart = readCart();
  if (!cart.length) {
    document.getElementById("checkout-message").textContent = "Your cart is empty.";
    return;
  }
  const lines = getPricedLines();
  const validation = cartValidationError(lines);
  if (validation) {
    renderOrderSummary();
    return;
  }
  const form = event.currentTarget;
  if (!form.reportValidity()) return;
  const values = Object.fromEntries(new FormData(form).entries());
  const button = document.getElementById("place-order-btn");
  const message = document.getElementById("checkout-message");
  button.disabled = true;
  button.textContent = "Connecting to Paystack…";
  message.textContent = "";
  message.classList.remove("is-error");
  try {
    const response = await fetch(`${API_URL}/payments/initialize`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customer_name: values.fullName.trim(), email: values.email.trim(), phone: values.phone.trim(),
        expected_total: currentCartTotal(lines),
        items: cart.map(item => ({ product_id: item.id ?? item.product_id, quantity: Number(item.qty ?? item.quantity), size: item.size || "" }))
      })
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Could not start payment.");
    window.location.assign(result.authorization_url);
  } catch (error) {
    message.textContent = error.message;
    message.classList.add("is-error");
    button.disabled = false;
    button.textContent = "Pay securely with Paystack";
  }
});

renderOrderSummary();
loadCheckoutCatalogue();
verifyReturnedPayment();

window.addEventListener("storage", event => {
  if (event.key === "kayshaven-cart" || event.key === null) renderOrderSummary();
});
window.addEventListener("focus", renderOrderSummary);
window.addEventListener("pageshow", renderOrderSummary);
document.addEventListener("visibilitychange", () => {
  if (!document.hidden) renderOrderSummary();
});
