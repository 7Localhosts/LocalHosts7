function readCart() {
  try {
    const items = JSON.parse(localStorage.getItem("kayshaven-cart") || "[]");
    return Array.isArray(items) ? items.map(item => ({
      ...item,
      id: item.id ?? item.product_id,
      qty: Number(item.qty ?? item.quantity) || 1
    })) : [];
  } catch {
    return [];
  }
}

let cart = readCart();
const cartAvailability = new Map();
const money = amount => `GHS ${Number(amount || 0).toFixed(2)}`;
const API_URL = `${window.KAYS_HAVEN_API_URL}/api/products`;

async function currentProduct(productId) {
  const response = await fetch(API_URL, { cache: "no-store" });
  if (!response.ok) throw new Error("Current inventory could not be checked. Try again shortly.");
  const { products = [] } = await response.json();
  const product = products.find(item => String(item.id) === String(productId));
  if (!product) throw new Error("This product is no longer available.");
  if (product.is_active === false || !Number.isFinite(Number(product.price)) || Number(product.price) <= 0) throw new Error("This product is currently unavailable for checkout.");
  return product;
}
const safe = value => String(value ?? "").replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[char]);

function renderCart() {
  const items = document.getElementById("cart-items");
  const pricesConfirmed = cart.length > 0 && cart.every(item => cartAvailability.get(String(item.id)) === true);
  const subtotal = cart.reduce((sum, item) => sum + Number(item.price || 0) * item.qty, 0);
  items.innerHTML = cart.length ? cart.map((item, index) => {
    const available = cartAvailability.get(String(item.id)) === true;
    const pending = !cartAvailability.has(String(item.id));
    const source = available ? cartAvailability.get(`product:${item.id}`) : null;
    const image = available ? productImageUrl(source || item, "../product-images/") : "";
    const fallback = '<span class="cart-item-image cart-item-image-fallback" aria-label="Product photo unavailable">Photo unavailable</span>';
    return `
    <article class="cart-item" data-cart-index="${index}">
      ${image ? `<img class="cart-item-image" src="${safe(image)}" alt="${safe(item.name)}">` : fallback}
      <div class="cart-item-info"><h3>${safe(item.name)}</h3><p>${available ? money(item.price) : pending ? "Checking current price…" : "Price to be confirmed"}${item.size ? ` · Size: ${safe(item.size)}` : ""}</p>
        ${pending ? "<p class=\"cart-availability\">Checking current price…</p>" : available ? "" : "<p class=\"cart-availability\">This item is unavailable at its current price. Remove it to continue.</p>"}
        <label>Quantity <input type="number" min="1" value="${item.qty}" data-quantity="${index}"></label>
      </div>
      <button class="remove" type="button" data-remove="${index}" aria-label="Remove ${safe(item.name)} from cart"><svg class="trash-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M4 7h16m-10 4v7m4-7v7M6 7l1 14h10l1-14M9 7V4h6v3"/></svg></button>
    </article>`;
  }).join("") : "<p>Your cart is empty. <a href=\"../shop.html#shop\">Browse products</a>.</p>";
  document.getElementById("summary-total").textContent = !cart.length ? money(0) : pricesConfirmed ? money(subtotal) : "Price to be confirmed";
  document.getElementById("checkout-button").disabled = !cart.length || cart.some(item => cartAvailability.get(String(item.id)) !== true);
  items.querySelectorAll("img.cart-item-image").forEach(image => image.addEventListener("error", () => {
    const fallback = document.createElement("span");
    fallback.className = "cart-item-image cart-item-image-fallback";
    fallback.textContent = "Photo unavailable";
    fallback.setAttribute("aria-label", "Product photo unavailable");
    image.replaceWith(fallback);
  }, { once: true }));
}

async function refreshCartAvailability() {
  if (!cart.length) return;
  try {
    const response = await fetch(API_URL, { cache: "no-store" });
    if (!response.ok) throw new Error("Current products could not be loaded.");
    const { products = [] } = await response.json();
    await Promise.all(cart.map(async item => {
      const id = String(item.id ?? item.product_id);
      const product = products.find(entry => String(entry.id) === id);
      const image = product ? productImageUrl(product, "../product-images/") : "";
      const available = Boolean(product && product.is_active !== false && Number.isFinite(Number(product.price)) && Number(product.price) > 0);
      cartAvailability.set(id, available);
      if (!product) return;
      cartAvailability.set(`product:${id}`, product);
      item.name = product.name;
      item.price = Number.isFinite(Number(product.price)) && Number(product.price) > 0 ? Number(product.price) : null;
      item.image = product.image || image;
    }));
    localStorage.setItem("kayshaven-cart", JSON.stringify(cart));
  } catch (error) {
    cart.forEach(item => cartAvailability.set(String(item.id), false));
    document.getElementById("cart-message").textContent = error.message;
  }
  renderCart();
}

document.getElementById("cart-items").addEventListener("change", event => {
  if (!event.target.matches("[data-quantity]")) return;
  const index = Number(event.target.dataset.quantity);
  const quantity = Number(event.target.value);
  const item = cart[index];
  const input = event.target;
  const message = document.getElementById("cart-message");
  if (!item) return;
  if (!Number.isInteger(quantity) || quantity < 1) {
    input.value = item.qty;
    return;
  }
  input.disabled = true;
  message.textContent = "Checking product availability…";
  currentProduct(item.id).then(() => {
    item.qty = quantity;
    localStorage.setItem("kayshaven-cart", JSON.stringify(cart));
    message.textContent = "";
    renderCart();
  }).catch(error => {
    input.value = item.qty;
    input.disabled = false;
    message.textContent = error.message;
  });
});

document.getElementById("cart-items").addEventListener("click", event => {
  const button = event.target.closest("[data-remove]");
  if (!button) return;
  cart.splice(Number(button.dataset.remove), 1);
  localStorage.setItem("kayshaven-cart", JSON.stringify(cart));
  renderCart();
});

document.getElementById("checkout-button").addEventListener("click", () => {
  if (cart.length) window.location.href = "../checkout/checkout.html";
});

renderCart();
refreshCartAvailability();
