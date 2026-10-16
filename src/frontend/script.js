let products = [];
let productsLoading = true;
let cart = readStoredCart();

function readStoredCart() {
  try {
    const stored = JSON.parse(localStorage.getItem("kayshaven-cart") || "[]");
    return Array.isArray(stored) ? stored.filter(Boolean).map(item => ({
      ...item,
      id: item.id ?? item.product_id,
      qty: Number(item.qty ?? item.quantity) || 1,
      size: item.size || ""
    })) : [];
  } catch {
    return [];
  }
}

let currentFilter = "All";

const $ = id => document.getElementById(id);

const money = amount =>
  `GHS ${Number(amount || 0).toFixed(2)}`;

function cartImageUrl(product) {
  const image = productImageUrl(product);
  if (!image || /^(https?:|data:|blob:)/i.test(image)) return image;
  return new URL(image.replace(/^(\.\.\/)+/, ""), document.baseURI).href;
}

async function productsWithLoadedImages(candidates, onProgress = () => {}) {
  const visible = new Array(candidates.length);
  let nextIndex = 0;
  const worker = async () => {
    while (nextIndex < candidates.length) {
      const index = nextIndex++;
      const product = candidates[index];
      const imageUrl = cartImageUrl(product);
      if (await productImageLoads(imageUrl)) {
        visible[index] = { ...product, _catalogImageUrl: imageUrl };
        onProgress(visible.filter(Boolean));
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(8, candidates.length) }, worker));
  return visible.filter(Boolean);
}


/* =========================
   LOAD PRODUCTS
========================= */

async function loadProducts() {
  productsLoading = true;
  try {
    const response = await fetch(`${window.KAYS_HAVEN_API_URL}/api/products`);

    if (!response.ok) {
      throw new Error(`Server error: ${response.status}`);
    }

    const data = await response.json();

    const candidates = Array.isArray(data.products)
      ? data.products.filter(product => Number.isFinite(Number(product.price)) && Number(product.price) > 0)
      : [];
    products = [];
    renderProducts();
    products = await productsWithLoadedImages(candidates, available => {
      products = available;
      renderProducts();
    });

    productsLoading = false;
    renderProducts();
  } catch (error) {
    productsLoading = false;
    console.error("Failed to load products:", error);

    if ($("productGrid")) {
      $("productGrid").innerHTML = `
        <div class="empty-cart">
          <p>Could not load products.</p>
          <p>Please try again later.</p>
        </div>
      `;
    }

    toast("Could not load products");
  }
}


/* =========================
   PRODUCT LIST
========================= */

function renderProducts() {
  const grid = $("productGrid");

  if (!grid) return;

  const matches = products.filter(product => {
    const name = String(product.name || "").toLowerCase();
    const category = String(product.category || "").toLowerCase();

    return currentFilter === "All" || product.category === currentFilter;
  });

  grid.innerHTML = matches.map(product => {

    const imageUrl = product._catalogImageUrl || cartImageUrl(product);
    const image = `<img data-catalog-image src="${escapeHtml(imageUrl)}" alt="${escapeHtml(product.name)}" loading="lazy" decoding="async">`;
    const badge = String(product.badge || "").trim();
    const showBadge = badge && !/\bout\s+of\s+stock\b/i.test(badge);

    return `
      <article class="product-card" data-product-card="${escapeHtml(product.id)}">

        <a href="products/product.html?id=${encodeURIComponent(product.id)}" class="product-link">

          <div class="product-image">

            ${showBadge ? `<span class="product-badge">${escapeHtml(badge)}</span>` : ""}

            ${image}
</div>

          <div class="product-info">

            <small>${escapeHtml(product.category || "")}</small>

            <h3>${escapeHtml(product.name || "Unnamed Product")}</h3>

            <strong>${money(product.price)}</strong>

          </div>

        </a>

        <button
          class="add-btn"
          type="button"
          data-add-product="${escapeHtml(product.id)}"
          aria-label="Quick add ${escapeHtml(product.name || "product")}"
        >
          Quick add
        </button>

      </article>
    `;
  }).join("");

  grid.querySelectorAll("img[data-catalog-image]").forEach(image => {
    image.addEventListener("error", () => {
      const card = image.closest("[data-product-card]");
      if (!card) return;
      const failedId = card.dataset.productCard;
      products = products.filter(product => String(product.id) !== String(failedId));
      renderProducts();
    }, { once: true });
  });

  if ($("emptyState")) {
    $("emptyState").textContent = productsLoading ? "Loading products…" : "No products found. Try another search.";
    $("emptyState").style.display = matches.length ? "none" : "block";
  }
}


/* =========================
   CART STORAGE
========================= */

function saveCart() {
  localStorage.setItem(
    "kayshaven-cart",
    JSON.stringify(cart)
  );
}


/* =========================
   CART TOTALS
========================= */

function cartCount() {
  return cart.reduce(
    (sum, item) => sum + Number(item.qty || 0),
    0
  );
}

function cartTotal() {
  return cart.reduce(
    (sum, item) =>
      sum + Number(item.price || 0) * Number(item.qty || 0),
    0
  );
}


/* =========================
   ADD TO CART
========================= */

function addToCart(id) {

  const product = products.find(item => String(item.id) === String(id));

  if (!product) {
    toast("Product not found");
    return;
  }

  if (productSizeOptions(product).length) {
    window.location.href = `products/product.html?id=${encodeURIComponent(product.id)}`;
    return;
  }
  const existing = cart.find(item => String(item.id) === String(id) && !item.size);

  if (existing) {
    existing.qty++;

  } else {

    cart.push({
      ...product,
      image: cartImageUrl(product),
      qty: 1
    });

  }

  saveCart();
  renderCart();
  openCart();

  toast("Added to cart");
}


/* =========================
   CHANGE QUANTITY
========================= */

function changeQty(id, delta) {

  const item = cart.find(
    product => String(product.id) === String(id)
  );

  if (!item) return;

  const product = products.find(
    product => String(product.id) === String(id)
  );

  item.qty += Number(delta);

  if (item.qty <= 0) {

    cart = cart.filter(
      product => String(product.id) !== String(id)
    );

  }

  saveCart();
  renderCart();
}


/* =========================
   RENDER CART
========================= */

function renderCart() {

  if ($("cartCount")) {
    $("cartCount").textContent = cartCount();
  }
  if ($("cartBtn")) {
    const count = cartCount();
    $("cartBtn").setAttribute("aria-label", `Open shopping cart, ${count} ${count === 1 ? "item" : "items"}`);
  }

  if ($("cartTotal")) {
    $("cartTotal").textContent = money(cartTotal());
  }

  if ($("checkoutTotal")) {
    $("checkoutTotal").textContent = money(cartTotal());
  }

  if ($("checkoutBtn")) {
    $("checkoutBtn").disabled = !cart.length;
  }

  if (!$("cartItems")) return;

  $("cartItems").innerHTML = cart.length

    ? cart.map((item, index) => {
      const image = cartImageUrl(item);
      return `

      <div class="cart-item">

        <div class="mini-img">

          ${
            image
              ? `<img src="${escapeHtml(image)}" alt="${escapeHtml(item.name)}">`
              : `PRODUCT<br>IMAGE`
          }

        </div>

        <div>

          <h4>${escapeHtml(item.name)}</h4>

          <p>${money(item.price)}</p>
          ${item.size ? `<p>Size: ${escapeHtml(item.size)}</p>` : ""}

          <div class="qty">

            <button
              onclick="changeCartQty(${index}, -1)"
              aria-label="Decrease quantity"
            >
              −
            </button>

            <span>${item.qty}</span>

            <button
              onclick="changeCartQty(${index}, 1)"
              aria-label="Increase quantity"
            >
              +
            </button>

          </div>

        </div>

        <button
          class="remove"
          type="button"
          aria-label="Remove ${escapeHtml(item.name)} from cart"
          onclick="changeCartQty(${index}, -${item.qty})"
        >
          <svg class="trash-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M4 7h16m-10 4v7m4-7v7M6 7l1 14h10l1-14M9 7V4h6v3"/></svg>
        </button>

      </div>

    `;
    }).join("")

    : `

      <div class="empty-cart">

        <p>Your cart is empty.</p>

        <p>Add something from the shop to get started.</p>

      </div>

    `;
}


/* =========================
   CART DRAWER
========================= */

function openCart() {

  if ($("cartDrawer")) {
    $("cartDrawer").classList.add("open");
  }

  if ($("overlay")) {
    $("overlay").classList.add("show");
  }
}

function closeCart() {

  if ($("cartDrawer")) {
    $("cartDrawer").classList.remove("open");
  }

  if ($("overlay")) {
    $("overlay").classList.remove("show");
  }
}


/* =========================
   TOAST
========================= */

function toast(message) {

  const element = $("toast");

  if (!element) return;

  element.textContent = message;
  element.classList.add("show");

  setTimeout(() => {
    element.classList.remove("show");
  }, 2200);
}


/* =========================
   PRODUCT FILTER BUTTONS
========================= */

document.querySelectorAll(".filter").forEach(button => {

  button.addEventListener("click", () => {

    document.querySelectorAll(".filter").forEach(item => {
      item.classList.remove("active");
    });

    button.classList.add("active");

    currentFilter = button.dataset.filter || "All";

    renderProducts();

    if ($("shop")) {
      $("shop").scrollIntoView({
        behavior: "smooth",
        block: "start"
      });
    }

  });

});


/* =========================
   CATEGORY CARDS
========================= */

document.querySelectorAll(".category-card").forEach(button => {

  button.addEventListener("click", () => {

    currentFilter = button.dataset.category || "All";

    document.querySelectorAll(".filter").forEach(item => {

      item.classList.toggle(
        "active",
        item.dataset.filter === currentFilter
      );

    });

    renderProducts();

    if ($("shop")) {
      $("shop").scrollIntoView({
        behavior: "smooth",
        block: "start"
      });
    }

  });

});


if ($("menuBtn") && $("mobileNav")) {
  const menuButton = $("menuBtn");
  const mobileNav = $("mobileNav");
  const setMobileMenu = open => {
    mobileNav.hidden = !open;
    menuButton.setAttribute("aria-expanded", String(open));
  };

  menuButton.addEventListener("click", () => {
    setMobileMenu(mobileNav.hidden);
  });

  mobileNav.querySelectorAll("a").forEach(link => {
    link.addEventListener("click", () => setMobileMenu(false));
  });
}

/* =========================
   CART BUTTONS
========================= */

if ($("cartBtn")) {
  $("cartBtn").onclick = openCart;
}

if ($("checkoutBtn")) {
  $("checkoutBtn").addEventListener("click", () => {
    if (!cart.length) return;
    window.location.href = "checkout/checkout.html";
  });
}

if ($("closeCart")) {
  $("closeCart").onclick = closeCart;
}

if ($("overlay")) {
  $("overlay").onclick = closeCart;
}



loadProducts();
renderCart();

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, character => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
  })[character]);
}

function changeCartQty(index, delta) {
  const item = cart[index];
  if (!item) return;
  const next = Number(item.qty || 0) + Number(delta);
  if (next <= 0) cart.splice(index, 1);
  else item.qty = next;
  saveCart();
  renderCart();
}

document.addEventListener("click", event => {
  const button = event.target.closest("[data-add-product]");
  if (button) addToCart(button.dataset.addProduct);
});

document.addEventListener("keydown", event => {
  if (event.key !== "Escape") return;
  if ($("mobileNav") && !$("mobileNav").hidden) {
    $("mobileNav").hidden = true;
    $("menuBtn")?.setAttribute("aria-expanded", "false");
    $("menuBtn")?.focus();
  }
});
