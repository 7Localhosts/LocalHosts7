const params = new URLSearchParams(window.location.search);
const productId = params.get("id");
const API_URL = `${window.KAYS_HAVEN_API_URL}/api/products`;
const money = value => `GHS ${Number(value || 0).toFixed(2)}`;

async function loadProduct() {
  const page = document.querySelector(".product-page");
  const loading = document.getElementById("product-loading");
  const details = document.querySelector(".product-details");
  try {
    const response = await fetch(API_URL);
    if (!response.ok) throw new Error("Products are temporarily unavailable.");
    const { products = [] } = await response.json();
    const product = products.find(item => String(item.id) === String(productId));
    if (!product) throw new Error("This product could not be found.");

    const imageUrl = productImageUrl(product, "../product-images/");
    document.title = `${product.name} | Kay's Haven`;
    document.getElementById("product-name").textContent = product.name;
    const price = Number(product.price);
    const priceIsValid = Number.isFinite(price) && price > 0;
    document.getElementById("product-price").textContent = priceIsValid ? money(price) : "Price to be confirmed";
    document.getElementById("product-description").textContent = product.description || "";
    document.querySelector(".product-category").textContent = product.category || "KAY'S HAVEN";
    const image = document.getElementById("product-image");
    const imageFrame = image.parentElement;
    imageFrame.classList.remove("is-missing");
    image.hidden = !imageUrl;
    image.onerror = () => {
      image.hidden = true;
      imageFrame.classList.add("is-missing");
    };
    if (imageUrl) image.src = imageUrl;
    image.alt = product.name;
    if (!imageUrl) imageFrame.classList.add("is-missing");

    const quantity = document.getElementById("quantity");
    quantity.min = "1";
    quantity.removeAttribute("max");
    quantity.step = "1";
    const sizeSelect = document.getElementById("product-size");
    const sizes = productSizeOptions(product);
    const sizeField = document.querySelector(".product-variant");
    sizeField.hidden = false;
    sizeSelect.required = sizes.length > 0;
    sizeSelect.addEventListener("change", () => sizeSelect.setCustomValidity(""));
    const selectPrompt = document.createElement("option");
    selectPrompt.value = "";
    selectPrompt.textContent = "None / N/A";
    selectPrompt.selected = true;
    const sizeLabel = value => ({
      s: "Small (S)", small: "Small (S)", "small (s)": "Small (S)",
      m: "Medium (M)", medium: "Medium (M)", "medium (m)": "Medium (M)",
      l: "Large (L)", large: "Large (L)", "large (l)": "Large (L)",
      xl: "Extra Large (XL)", xlarge: "Extra Large (XL)", "extra large": "Extra Large (XL)", "extra large (xl)": "Extra Large (XL)", xxl: "Extra Large (XL)", "2xl": "Extra Large (XL)"
    }[String(value).trim().toLowerCase()] || String(value));
    sizeSelect.replaceChildren(selectPrompt, ...sizes.map(size => {
      const option = document.createElement("option");
      option.value = size;
      option.textContent = sizeLabel(size);
      return option;
    }));

    const decreaseQuantity = document.getElementById("decrease-quantity");
    const increaseQuantity = document.getElementById("increase-quantity");
    decreaseQuantity.onclick = () => quantity.value = Math.max(1, Number(quantity.value) - 1);
    increaseQuantity.onclick = () => quantity.value = Math.max(1, Number(quantity.value) || 1) + 1;
    quantity.addEventListener("change", () => {
      quantity.value = Math.max(1, Number(quantity.value) || 1);
    });

    const addButton = document.getElementById("add-to-cart");
    addButton.disabled = !priceIsValid;
    addButton.textContent = !priceIsValid ? "Price to be confirmed" : "Add to Cart";
    addButton.onclick = () => {
      const qty = Number(quantity.value);
      if (!Number.isInteger(qty) || qty < 1) return;
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
        existing.qty = currentQty + qty;
      } else {
        const productImage = productImageUrl(product, "../product-images/");
        cart.push({ id: product.id, name: product.name, category: product.category, price: Number(product.price), image: productImage ? new URL(productImage, window.location.href).href : "", size, qty });
      }
      localStorage.setItem("kayshaven-cart", JSON.stringify(cart));
      window.location.href = "../shop.html";
    };
    details.hidden = false;
    loading.hidden = true;
    page.setAttribute("aria-busy", "false");
  } catch (error) {
    console.error("Product loading error:", error);
    page.setAttribute("aria-busy", "false");
    page.innerHTML = `<h1>Product unavailable</h1><p>${escapeProductText(error.message)}</p><a href="../shop.html#shop">Back to shop</a>`;
  }
}

function escapeProductText(value) {
  const element = document.createElement("span");
  element.textContent = value;
  return element.innerHTML;
}

loadProduct();
