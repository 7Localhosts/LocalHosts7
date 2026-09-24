let products = [];

async function loadProducts() {
  try {
    const response = await fetch("http://localhost:8000/api/products");

    if (!response.ok) {
      throw new Error(`Server error: ${response.status}`);
    }

    const data = await response.json();

    products = data.products || [];

    renderProducts();
  } catch (error) {
    console.error("Failed to load products:", error);
    toast("Could not load products");
  }
}

let cart = JSON.parse(localStorage.getItem("kayshaven-cart") || "[]");
let currentFilter = "All";
let searchTerm = "";

const $ = id => document.getElementById(id);
const money = n => `GHS ${Number(n).toFixed(2)}`;

function renderProducts() {
  const grid = $("productGrid");

  const matches = products.filter(product =>
    (currentFilter === "All" || product.category === currentFilter) &&
    (
      product.name.toLowerCase().includes(searchTerm) ||
      product.category.toLowerCase().includes(searchTerm)
    )
  );

  grid.innerHTML = matches.map(product => `
    <article class="product-card">
      <a href="products/product.html?id=${product.id}" class="product-link">
        <div class="product-image">
          ${product.badge ? `<span class="product-badge">${product.badge}</span>` : ""}
          <div class="placeholder">ADD<br>PRODUCT IMAGE</div>
        </div>

        <div class="product-info">
          <small>${product.category}</small>
          <h3>${product.name}</h3>
          <strong>${money(product.price)}</strong>
        </div>
      </a>

      <button
        class="add-btn"
        onclick="addToCart(${product.id})"
        aria-label="Add ${product.name} to cart"
      >+</button>
    </article>
  `).join("");

  $("emptyState").style.display = matches.length ? "none" : "block";
}

function saveCart() {
  localStorage.setItem("kayshaven-cart", JSON.stringify(cart));
}

function cartCount() {
  return cart.reduce((sum, item) => sum + item.qty, 0);
}

function cartTotal() {
  return cart.reduce((sum, item) => sum + item.price * item.qty, 0);
}

function addToCart(id) {
  const product = products.find(item => item.id === id);

  if (!product) return;

  const existing = cart.find(item => item.id === id);

  if (existing) {
    existing.qty++;
  } else {
    cart.push({...product, qty: 1});
  }

  saveCart();
  renderCart();
  openCart();
  toast("Added to cart");
}

function changeQty(id, delta) {
  const item = cart.find(product => product.id === id);

  if (!item) return;

  item.qty += delta;

  if (item.qty <= 0) {
    cart = cart.filter(product => product.id !== id);
  }

  saveCart();
  renderCart();
}

function renderCart() {
  $("cartCount").textContent = cartCount();
  $("cartTotal").textContent = money(cartTotal());

  if ($("checkoutTotal")) {
    $("checkoutTotal").textContent = money(cartTotal());
  }

  $("cartItems").innerHTML = cart.length
    ? cart.map(item => `
      <div class="cart-item">
        <div class="mini-img">PRODUCT<br>IMAGE</div>

        <div>
          <h4>${item.name}</h4>
          <p>${money(item.price)}</p>

          <div class="qty">
            <button onclick="changeQty(${item.id}, -1)">−</button>
            <span>${item.qty}</span>
            <button onclick="changeQty(${item.id}, 1)">+</button>
          </div>
        </div>

        <button
          class="remove"
          onclick="changeQty(${item.id}, -${item.qty})"
        >Remove</button>
      </div>
    `).join("")
    : `
      <div class="empty-cart">
        <p>Your cart is empty.</p>
        <p>Add something from the shop to get started.</p>
      </div>
    `;
}

function openCart() {
  $("cartDrawer").classList.add("open");
  $("overlay").classList.add("show");
}

function closeCart() {
  $("cartDrawer").classList.remove("open");
  $("overlay").classList.remove("show");
}

function toast(message) {
  const element = $("toast");

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

    currentFilter = button.dataset.filter;

    renderProducts();

    $("shop").scrollIntoView({
      behavior: "smooth",
      block: "start"
    });
  });
});


/* =========================
   CATEGORY CARDS
========================= */

document.querySelectorAll(".category-card").forEach(button => {
  button.addEventListener("click", () => {

    currentFilter = button.dataset.category;

    document.querySelectorAll(".filter").forEach(item => {
      item.classList.toggle(
        "active",
        item.dataset.filter === currentFilter
      );
    });

    renderProducts();

    $("shop").scrollIntoView({
      behavior: "smooth",
      block: "start"
    });
  });
});


/* =========================
   SEARCH
========================= */

$("searchBtn").onclick = () => {
  $("searchPanel").style.display = "block";
  $("searchInput").focus();
};

$("closeSearch").onclick = () => {
  $("searchPanel").style.display = "none";
  $("searchInput").value = "";
  searchTerm = "";

  renderProducts();
};

$("searchInput").oninput = event => {
  searchTerm = event.target.value.toLowerCase().trim();

  renderProducts();
};


/* =========================
   CART
========================= */

$("cartBtn").onclick = openCart;

$("closeCart").onclick = closeCart;

$("overlay").onclick = closeCart;


/* =========================
   MOBILE MENU
========================= */

$("menuBtn").onclick = () => {
  $("mobileNav").style.display =
    $("mobileNav").style.display === "flex"
      ? "none"
      : "flex";
};

document.querySelectorAll(".mobile-nav a").forEach(link => {
  link.onclick = () => {
    $("mobileNav").style.display = "none";
  };
});


/* =========================
   CHECKOUT
========================= */

$("checkoutBtn").onclick = () => {
  if (!cart.length) {
    toast("Your cart is empty");
    return;
  }

  window.location.href = "checkout/checkout.html";
};


/* =========================
   NEWSLETTER
========================= */

$("newsletterForm").onsubmit = event => {
  event.preventDefault();

  event.target.reset();

  toast("Newsletter form ready for backend integration.");
};


/* =========================
   START PAGE
========================= */

loadProducts();
renderCart();