const params = new URLSearchParams(window.location.search);
const productId = params.get("id");
const API_URL = `${window.KAYS_HAVEN_API_URL || "http://localhost:8000"}/api/products`;
const money = value => `GHS ${Number(value || 0).toFixed(2)}`;

async function loadProduct() {
  const page = document.querySelector(".product-page");
  try {
    const response = await fetch(API_URL);
    if (!response.ok) throw new Error("Products are temporarily unavailable.");
    const { products = [] } = await response.json();
    const product = products.find(item => String(item.id) === String(productId));
    if (!product) throw new Error("This product could not be found.");

    document.title = `${product.name} | Kay's Haven`;
    document.getElementById("product-name").textContent = product.name;
    document.getElementById("product-price").textContent = money(product.price);
    document.getElementById("product-description").textContent = product.description || "";
    document.querySelector(".product-category").textContent = product.category || "KAY'S HAVEN";
    const image = document.getElementById("product-image");
    image.src = productImageUrl(product, "../Images/");
    image.alt = product.name;

    const quantity = document.getElementById("quantity");
    const stock = Math.max(0, Number(product.stock || 0));
    quantity.max = stock;
    const sizeSelect = document.getElementById("product-size");
    const sizes = Array.isArray(product.sizes) ? product.sizes : [];
    const sizeField = document.querySelector(".product-variant");
    sizeField.hidden = !sizes.length;
    sizeSelect.required = sizes.length > 0;
    sizeSelect.addEventListener("change", () => sizeSelect.setCustomValidity(""));
    const selectPrompt = document.createElement("option");
    selectPrompt.value = "";
    selectPrompt.textContent = "Choose a size";
    selectPrompt.disabled = true;
    selectPrompt.selected = true;
    sizeSelect.replaceChildren(selectPrompt, ...sizes.map(size => {
      const option = document.createElement("option");
      option.value = size;
      option.textContent = size;
      return option;
    }));

    document.getElementById("decrease-quantity").onclick = () => quantity.value = Math.max(1, Number(quantity.value) - 1);
    document.getElementById("increase-quantity").onclick = () => quantity.value = Math.min(stock || 1, Number(quantity.value) + 1);
    quantity.addEventListener("change", () => quantity.value = Math.max(1, Math.min(stock || 1, Number(quantity.value) || 1)));

    const addButton = document.getElementById("add-to-cart");
    addButton.disabled = stock <= 0;
    addButton.textContent = stock > 0 ? "Add to Cart" : "Out of Stock";
    addButton.onclick = () => {
      const qty = Number(quantity.value);
      if (!Number.isInteger(qty) || qty < 1 || qty > stock) return;
      if (sizes.length && !sizeSelect.value) {
        sizeSelect.setCustomValidity("Choose a size.");
        sizeSelect.reportValidity();
        return;
      }
      let cart;
      try { cart = JSON.parse(localStorage.getItem("kayshaven-cart") || "[]"); }
      catch { cart = []; }
      if (!Array.isArray(cart)) cart = [];
      const size = sizes.length ? sizeSelect.value : "";
      const existing = cart.find(item => String(item.id) === String(product.id) && String(item.size || "") === size);
      if (existing) {
        const currentQty = Number(existing.qty ?? existing.quantity ?? 0);
        if (currentQty + qty > stock) {
          alert("That quantity is greater than the available stock.");
          return;
        }
        existing.qty = currentQty + qty;
      } else {
        cart.push({ id: product.id, name: product.name, category: product.category, price: Number(product.price), image: product.image || "", size, qty });
      }
      localStorage.setItem("kayshaven-cart", JSON.stringify(cart));
      window.location.href = "../index.html";
    };
  } catch (error) {
    console.error("Product loading error:", error);
    page.innerHTML = `<h1>Product unavailable</h1><p>${escapeProductText(error.message)}</p><a href="../index.html#shop">Back to shop</a>`;
  }
}

function escapeProductText(value) {
  const element = document.createElement("span");
  element.textContent = value;
  return element.innerHTML;
}

loadProduct();
