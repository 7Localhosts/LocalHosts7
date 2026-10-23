const API_URL = `${window.KAYS_HAVEN_API_URL}/api`;
const paymentButtonState = window.KaysHavenCheckoutPaymentButtonState;
let checkoutProducts = new Map();
let checkoutCatalogueReady = false;
let checkoutCatalogueError = "";
let checkoutPaymentState = "ready";
let paymentVerificationPending = false;
let verifiedReceipt = null;

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

function returnedPaymentReference() {
  return new URLSearchParams(window.location.search).get("reference") || "";
}

function syncPaymentButton(canStartPayment) {
  const button = document.getElementById("place-order-btn");
  const presentation = paymentButtonState.buttonPresentation(checkoutPaymentState, canStartPayment);
  button.disabled = presentation.disabled;
  button.textContent = presentation.label;
}

function setCheckoutPaymentState(state) {
  checkoutPaymentState = state;
  const lines = getPricedLines();
  const canStartPayment = Boolean(lines.length && checkoutCatalogueReady && !cartValidationError(lines));
  syncPaymentButton(canStartPayment);
}

function formatReceiptDate(value) {
  const date = new Date(value);
  return Number.isFinite(date.getTime())
    ? date.toLocaleString("en-GH", { dateStyle: "medium", timeStyle: "short", timeZone: "Africa/Accra" })
    : "Date unavailable";
}

function renderVerifiedReceipt(receipt) {
  if (!receipt || String(receipt.payment_status || "").trim().toLowerCase() !== "paid") {
    throw new Error("A receipt is available only after payment is verified.");
  }
  if (!Array.isArray(receipt.items) || !receipt.items.length) throw new Error("Receipt items are unavailable.");
  verifiedReceipt = receipt;
  document.getElementById("receipt-order-number").textContent = String(receipt.order_number || "Unavailable");
  document.getElementById("receipt-purchase-date").textContent = formatReceiptDate(receipt.purchase_date);
  document.getElementById("receipt-customer-name").textContent = String(receipt.customer_name || "Customer");
  document.getElementById("receipt-payment-status").textContent = "Paid";
  document.getElementById("receipt-total-amount").textContent = money(receipt.total_amount);

  const methodRow = document.getElementById("receipt-method-row");
  methodRow.hidden = !receipt.payment_method;
  if (receipt.payment_method) document.getElementById("receipt-payment-method").textContent = String(receipt.payment_method);
  const referenceRow = document.getElementById("receipt-reference-row");
  referenceRow.hidden = !receipt.payment_reference;
  if (receipt.payment_reference) document.getElementById("receipt-payment-reference").textContent = String(receipt.payment_reference);

  const itemsContainer = document.getElementById("receipt-items");
  itemsContainer.replaceChildren();
  receipt.items.forEach(item => {
    const row = document.createElement("div");
    row.className = "receipt-item";
    const name = document.createElement("span");
    name.className = "receipt-item-name";
    name.textContent = String(item.product_name || "Product");
    const quantity = Number(item.quantity);
    if (!Number.isInteger(quantity) || quantity < 1) throw new Error("Receipt quantity is invalid.");
    const quantityLabel = document.createElement("span");
    quantityLabel.className = "receipt-item-quantity";
    quantityLabel.textContent = `×${quantity}`;
    const size = document.createElement("span");
    size.className = "receipt-item-size";
    size.textContent = `Size: ${String(item.size || "N/A")}`;
    const prices = document.createElement("div");
    prices.className = "receipt-item-prices";
    const unitPrice = document.createElement("span");
    unitPrice.textContent = `Unit price: ${money(item.unit_price)}`;
    const lineTotal = document.createElement("strong");
    lineTotal.textContent = `Line total: ${money(item.line_total)}`;
    prices.append(unitPrice, lineTotal);
    row.append(name, quantityLabel, size, prices);
    itemsContainer.appendChild(row);
  });

  document.getElementById("receipt-message").textContent = "Your verified receipt is ready.";
  document.getElementById("receipt-view").hidden = false;
  document.getElementById("download-receipt").disabled = false;
  document.getElementById("print-receipt").disabled = false;
}

async function loadVerifiedReceipt(orderId, accessToken) {
  const message = document.getElementById("receipt-message");
  document.getElementById("receipt-view").hidden = false;
  if (!orderId || !accessToken) {
    message.textContent = "Payment is confirmed, but secure receipt access could not be created. Contact Kay's Haven with your order number.";
    return;
  }
  try {
    const response = await fetch(`${API_URL}/receipts/${encodeURIComponent(orderId)}`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    const result = await response.json();
    if (!response.ok || !result.receipt || String(result.receipt.payment_status || "").toLowerCase() !== "paid") {
      throw new Error(result.error || "The verified receipt is not available yet.");
    }
    renderVerifiedReceipt(result.receipt);
  } catch (error) {
    message.textContent = `${error.message || "The receipt could not be loaded."} Your payment confirmation is still valid.`;
  }
}

document.getElementById("download-receipt").addEventListener("click", () => {
  if (!verifiedReceipt) return;
  try {
    const blob = window.KaysHavenReceiptPdf.createReceiptPdf(verifiedReceipt);
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `kays-haven-${String(verifiedReceipt.order_number || "receipt").replace(/[^a-z0-9_-]/gi, "-")}.pdf`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  } catch (error) {
    document.getElementById("receipt-message").textContent = error.message || "Receipt PDF could not be generated.";
  }
});

document.getElementById("print-receipt").addEventListener("click", () => {
  if (verifiedReceipt) window.print();
});

function renderOrderSummary() {
  const lines = getPricedLines();
  const container = document.getElementById("order-items");
  const message = document.getElementById("checkout-price-message");
  const items = lines.map(({ item, product, quantity, unitPrice }) => {
    const image = product ? productImageUrl(product, "../product-images/") : "";
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
  syncPaymentButton(Boolean(lines.length && checkoutCatalogueReady && !validation));
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
      const image = productImageUrl(product, "../product-images/");
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
      if (product?.imageAvailable) item.image = product.image || productImageUrl(product, "../product-images/");
    });
    if (cartPricesChanged) localStorage.setItem("kayshaven-cart", JSON.stringify(cachedCart));
    renderOrderSummary();
  } catch (error) {
    checkoutCatalogueError = error.message || "Current product prices are unavailable. Please try again shortly.";
    renderOrderSummary();
  }
}

async function verifyPaymentReference(reference) {
  if (!reference || paymentVerificationPending) return;
  paymentVerificationPending = true;
  setCheckoutPaymentState("verifying");
  const message = document.getElementById("checkout-message");
  message.textContent = "";
  message.classList.remove("is-error");
  try {
    const response = await fetch(`${API_URL}/payments/verify`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reference }),
      signal: AbortSignal.timeout(20000)
    });
    const result = await response.json();
    if (!response.ok || result.success !== true || result.payment_status !== "paid") {
      throw new Error(result.error || "Payment is not confirmed yet.");
    }
    setCheckoutPaymentState("successful");
    localStorage.removeItem("kayshaven-cart");
    history.replaceState({}, "", window.location.pathname);
    await loadVerifiedReceipt(result.order_id, result.receipt_access_token);
  } catch (error) {
    setCheckoutPaymentState("verificationFailed");
    const failure = error.name === "TimeoutError" || error.name === "AbortError"
      ? "Payment verification timed out."
      : error.message || "Payment could not be confirmed yet.";
    message.textContent = `${failure} Select “Pay securely with Paystack” to retry verification for this payment. No new order will be created. If you were charged, contact us with reference ${reference}.`;
    message.classList.add("is-error");
  } finally {
    paymentVerificationPending = false;
  }
}

async function verifyReturnedPayment() {
  const reference = returnedPaymentReference();
  if (!reference) return;
  // Returned-payment retries verify the existing reference and do not need form validation.
  document.getElementById("checkout-form").noValidate = true;
  await verifyPaymentReference(reference);
}

document.getElementById("checkout-form").addEventListener("submit", async event => {
  event.preventDefault();
  const reference = returnedPaymentReference();
  if (paymentButtonState.actionForReference(reference) === "verify") {
    event.currentTarget.noValidate = true;
    await verifyPaymentReference(reference);
    return;
  }
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
  setCheckoutPaymentState("connecting");
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
    setCheckoutPaymentState("ready");
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
