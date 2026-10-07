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
const money = amount => `GHS ${Number(amount || 0).toFixed(2)}`;
const safe = value => String(value ?? "").replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[char]);

function renderCart() {
  const items = document.getElementById("cart-items");
  const subtotal = cart.reduce((sum, item) => sum + Number(item.price || 0) * item.qty, 0);
  items.innerHTML = cart.length ? cart.map((item, index) => `
    <article class="cart-item">
      ${item.image ? `<img src="${safe(item.image)}" alt="${safe(item.name)}">` : ""}
      <div><h3>${safe(item.name)}</h3><p>${money(item.price)}${item.size ? ` · Size: ${safe(item.size)}` : ""}</p>
        <label>Quantity <input type="number" min="1" value="${item.qty}" data-quantity="${index}"></label>
      </div>
      <button type="button" data-remove="${index}">Remove</button>
    </article>`).join("") : "<p>Your cart is empty. <a href=\"../index.html#shop\">Browse products</a>.</p>";
  document.getElementById("cart-total").textContent = money(subtotal);
  document.getElementById("summary-total").textContent = money(subtotal);
  document.getElementById("checkout-button").disabled = !cart.length;
}

document.getElementById("cart-items").addEventListener("change", event => {
  if (!event.target.matches("[data-quantity]")) return;
  const index = Number(event.target.dataset.quantity);
  const quantity = Number(event.target.value);
  if (!Number.isInteger(quantity) || quantity < 1) {
    cart.splice(index, 1);
  } else {
    cart[index].qty = quantity;
  }
  localStorage.setItem("kayshaven-cart", JSON.stringify(cart));
  renderCart();
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
