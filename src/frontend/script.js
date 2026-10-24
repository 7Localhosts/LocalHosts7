let products = [];
let productsLoading = true;
let cart = readStoredCart();
const PUBLIC_CATALOG_STORAGE_KEY = "kayshaven-public-catalog-v2";
const PUBLIC_CATALOG_MAX_AGE_MS = 15 * 1000;
const PUBLIC_CATALOG_STALE_LIMIT_MS = 2 * 60 * 1000;

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

function cleanPublicProduct(product) {
  if (!product || product.id == null || !String(product.name || "").trim()) return null;
  const parsedPrice = Number(product.price);
  const purchasable = Number.isFinite(parsedPrice) && parsedPrice > 0;
  return {
    id: product.id,
    name: String(product.name),
    category: String(product.category || ""),
    price: purchasable ? parsedPrice : null,
    purchasable,
    image: typeof product.image === "string" ? product.image : "",
    description: String(product.description || ""),
    sizes: Array.isArray(product.sizes) ? product.sizes.map(size => String(size)) : [],
    badge: String(product.badge || ""),
    _catalogImageUrl: cartImageUrl(product)
  };
}

function readPublicCatalogCache() {
  try {
    const cached = JSON.parse(localStorage.getItem(PUBLIC_CATALOG_STORAGE_KEY) || "null");
    const savedAt = Number(cached?.saved_at);
    if (!Number.isFinite(savedAt) || savedAt > Date.now() || Date.now() - savedAt > PUBLIC_CATALOG_STALE_LIMIT_MS || !Array.isArray(cached.products)) return null;
    const safeProducts = cached.products.map(cleanPublicProduct).filter(Boolean);
    return safeProducts.length ? { products: safeProducts, fresh: Date.now() - savedAt <= PUBLIC_CATALOG_MAX_AGE_MS } : null;
  } catch {
    return null;
  }
}

function writePublicCatalogCache(catalogue) {
  try {
    const safeProducts = catalogue.map(({ _catalogImageUrl, ...product }) => product);
    localStorage.setItem(PUBLIC_CATALOG_STORAGE_KEY, JSON.stringify({ saved_at: Date.now(), products: safeProducts }));
  } catch {
    // A full or disabled browser storage should not interrupt the live catalogue.
  }
}

function renderProductSkeletons(count = 8) {
  const grid = $("productGrid");
  if (!grid) return;
  grid.setAttribute("aria-busy", "true");
  grid.innerHTML = Array.from({ length: count }, () => `
    <article class="product-card product-card-skeleton" aria-hidden="true">
      <div class="skeleton-image"></div>
      <div class="skeleton-line skeleton-line-short"></div>
      <div class="skeleton-line"></div>
      <div class="skeleton-line skeleton-line-price"></div>
      <div class="skeleton-button"></div>
    </article>
  `).join("");
}

function ensureCategoryFilters(catalogue) {
  const wrap = document.querySelector(".filter-wrap");
  if (!wrap) return;
  const existing = new Set([...wrap.querySelectorAll(".filter")].map(button => button.dataset.filter));
  const categories = [...new Set(catalogue.map(product => String(product.category || "").trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b));
  categories.forEach(category => {
    if (existing.has(category)) return;
    const button = document.createElement("button");
    button.type = "button";
    button.className = "filter";
    button.dataset.filter = category;
    button.setAttribute("aria-pressed", "false");
    button.textContent = category;
    button.addEventListener("click", () => {
      updateCategorySelection(category);
      renderProducts();
      $("shop")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    wrap.appendChild(button);
  });
}


/* =========================
   LOAD PRODUCTS
========================= */

async function loadProducts() {
  const cached = readPublicCatalogCache();
  if (cached) {
    products = cached.products;
    ensureCategoryFilters(products);
    productsLoading = false;
    renderProducts();
  } else {
    productsLoading = true;
    renderProductSkeletons();
  }
  try {
    const response = await fetch(`${window.KAYS_HAVEN_API_URL}/api/products`, { cache: "no-store" });

    if (!response.ok) {
      throw new Error(`Server error: ${response.status}`);
    }

    const data = await response.json();

    if (!Array.isArray(data.products)) throw new Error("Invalid catalogue response");
    const candidates = [...new Map(data.products.map(cleanPublicProduct).filter(product => product && product._catalogImageUrl).map(product => [String(product.id), product])).values()];
    products = candidates;
    ensureCategoryFilters(products);
    writePublicCatalogCache(candidates);
    productsLoading = false;
    renderProducts();
  } catch (error) {
    productsLoading = false;
    console.error("Failed to load products:", error);

    if (!products.length && $("productGrid")) {
      $("productGrid").innerHTML = `
        <div class="empty-cart">
          <p>Could not load products.</p>
          <button type="button" class="add-btn" id="retry-products">Try again</button>
        </div>
      `;
      $("retry-products")?.addEventListener("click", loadProducts);
    } else if (products.length) {
      toast("Showing the saved catalogue. Current prices are confirmed securely at checkout.");
    }

    if (!products.length) toast("Could not load products");
    if ($("productGrid")) $("productGrid").setAttribute("aria-busy", "false");
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

  grid.setAttribute("aria-busy", String(productsLoading));
  grid.innerHTML = matches.map((product, index) => {

    const imageUrl = product._catalogImageUrl || cartImageUrl(product);
    const purchasable = product.purchasable === true && Number.isFinite(Number(product.price)) && Number(product.price) > 0;
    const image = imageUrl
      ? `<img data-catalog-image src="${escapeHtml(imageUrl)}" alt="${escapeHtml(product.name)}" width="800" height="880" loading="${index < 4 ? "eager" : "lazy"}" decoding="async"${index < 4 ? ' fetchpriority="high"' : ""}>`
      : "";
    const badge = String(product.badge || "").trim();
    const showBadge = badge && !/\bout\s+of\s+stock\b/i.test(badge);

    return `
      <article class="product-card" data-product-card="${escapeHtml(product.id)}">

        <a href="products/product.html?id=${encodeURIComponent(product.id)}" class="product-link">

          <div class="product-image" data-image-state="loading">

            <span class="placeholder" aria-hidden="true"></span>

            ${showBadge ? `<span class="product-badge">${escapeHtml(badge)}</span>` : ""}

            ${image}
</div>

          <div class="product-info">

            <small>${escapeHtml(product.category || "")}</small>

            <h3>${escapeHtml(product.name || "Unnamed Product")}</h3>

            <strong class="${purchasable ? "" : "product-price-unavailable"}">${purchasable ? money(product.price) : "Price to be confirmed"}</strong>

          </div>

        </a>

        <button
          class="add-btn"
          type="button"
          data-add-product="${escapeHtml(product.id)}"
          aria-label="Quick add ${escapeHtml(product.name || "product")}"
          ${purchasable ? "" : "disabled aria-disabled=\"true\""}
        >
          ${purchasable ? "Quick add" : "Unavailable"}
        </button>

      </article>
    `;
  }).join("");

  grid.querySelectorAll("img[data-catalog-image]").forEach(image => {
    const frame = image.closest(".product-image");
    image.addEventListener("load", () => { if (frame) frame.dataset.imageState = "loaded"; }, { once: true });
    image.addEventListener("error", () => {
      if (!frame) return;
      frame.dataset.imageState = "failed";
      image.hidden = true;
    }, { once: true });
    if (image.complete && image.naturalWidth > 0 && frame) frame.dataset.imageState = "loaded";
  });

  if ($("emptyState")) {
    $("emptyState").textContent = productsLoading ? "Loading products…" : "No products found. Try another search.";
    $("emptyState").style.display = productsLoading || matches.length ? "none" : "block";
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

  if (product.purchasable !== true || !Number.isFinite(Number(product.price)) || Number(product.price) <= 0) {
    toast("This item is unavailable until its price is confirmed.");
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

function updateCategorySelection(category) {
  currentFilter = category || "All";

  document.querySelectorAll(".filter").forEach(item => {
    const selected = item.dataset.filter === currentFilter;
    item.classList.toggle("active", selected);
    item.setAttribute("aria-pressed", String(selected));
  });

  document.querySelectorAll(".category-card").forEach(item => {
    item.setAttribute("aria-pressed", String(item.dataset.category === currentFilter));
  });
}

document.querySelectorAll(".filter").forEach(button => {

  button.addEventListener("click", () => {
    updateCategorySelection(button.dataset.filter);

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
    updateCategorySelection(button.dataset.category);

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
