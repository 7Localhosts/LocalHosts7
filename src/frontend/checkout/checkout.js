const API_URL = `${window.KAYS_HAVEN_API_URL || "http://localhost:8000"}/api`;
let DELIVERY_FEE = 15;
let checkoutConfigReady = false;

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

function renderOrderSummary() {
  const items = readCart();
  const container = document.getElementById("order-items");
  const subtotal = items.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.qty ?? item.quantity ?? 0), 0);
  container.innerHTML = items.length ? items.map(item => {
    const qty = Number(item.qty ?? item.quantity ?? 0);
    return `<div class="order-item"><div><div class="name">${escapeHtml(item.name || item.product_name)}</div><div class="qty">Qty: ${qty}${item.size ? ` · Size: ${escapeHtml(item.size)}` : ""}</div></div><div>${money(Number(item.price) * qty)}</div></div>`;
  }).join("") : "<p>Your cart is empty. <a href=\"../index.html#shop\">Continue shopping</a>.</p>";
  const total = subtotal + DELIVERY_FEE;
  document.getElementById("summary-subtotal").textContent = money(subtotal);
  document.getElementById("summary-delivery").textContent = money(DELIVERY_FEE);
  document.getElementById("summary-total").textContent = money(total);
  document.getElementById("place-order-btn").disabled = !items.length || !checkoutConfigReady;
}

async function loadCheckoutConfig() {
  try {
    const response = await fetch(`${API_URL}/checkout/config`);
    if (!response.ok) throw new Error("Checkout configuration is unavailable.");
    const config = await response.json();
    if (config.currency !== "GHS" || !Number.isFinite(Number(config.delivery_fee))) throw new Error("Checkout configuration is invalid.");
    DELIVERY_FEE = Number(config.delivery_fee);
    checkoutConfigReady = true;
    renderOrderSummary();
  } catch (error) {
    const message = document.getElementById("checkout-message");
    message.textContent = error.message;
    message.classList.add("is-error");
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
    button.textContent = "Try payment again";
  }
}

document.getElementById("checkout-form").addEventListener("submit", async event => {
  event.preventDefault();
  const cart = readCart();
  if (!cart.length) {
    document.getElementById("checkout-message").textContent = "Your cart is empty.";
    return;
  }
  if (!checkoutConfigReady) {
    document.getElementById("checkout-message").textContent = "Checkout is not ready. Please try again shortly.";
    return;
  }
  const form = event.currentTarget;
  if (!form.reportValidity()) return;
  const values = Object.fromEntries(new FormData(form).entries());
  const address = [values.address, values.city, values.region, values.notes && `Notes: ${values.notes}`].filter(Boolean).join(", ");
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
        shipping_address: address,
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
loadCheckoutConfig();
verifyReturnedPayment();
