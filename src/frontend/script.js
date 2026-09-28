let products = [];
let cart = JSON.parse(localStorage.getItem("kayshaven-cart") || "[]");

let currentFilter = "All";
let searchTerm = "";

const $ = id => document.getElementById(id);

const money = amount =>
  `GHS ${Number(amount || 0).toFixed(2)}`;


/* =========================
   LOAD PRODUCTS
========================= */

async function loadProducts() {
  try {
    const response = await fetch("http://localhost:8000/api/products");

    if (!response.ok) {
      throw new Error(`Server error: ${response.status}`);
    }

    const data = await response.json();

    products = Array.isArray(data.products) ? data.products : [];

    renderProducts();
  } catch (error) {
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

    return (
      (currentFilter === "All" || product.category === currentFilter) &&
      (
        name.includes(searchTerm) ||
        category.includes(searchTerm)
      )
    );
  });

  grid.innerHTML = matches.map(product => {

    const stock = Number(product.stock ?? 0);

    const image = product.image
      ? `<img src="${product.image}" alt="${product.name}">`
      : `<div class="placeholder">ADD<br>PRODUCT IMAGE</div>`;

    const outOfStock = stock <= 0;

    return `
      <article class="product-card">

        <a href="products/product.html?id=${product.id}" class="product-link">

          <div class="product-image">

            ${
              product.badge
                ? `<span class="product-badge">${product.badge}</span>`
                : ""
            }

            ${image}

            ${
              outOfStock
                ? `<span class="product-badge">Out of Stock</span>`
                : ""
            }

          </div>

          <div class="product-info">

            <small>${product.category || ""}</small>

            <h3>${product.name || "Unnamed Product"}</h3>

            <strong>${money(product.price)}</strong>

          </div>

        </a>

        <button
          class="add-btn"
          onclick="addToCart(${product.id})"
          aria-label="Add ${product.name} to cart"
          ${outOfStock ? "disabled" : ""}
        >
          +
        </button>

      </article>
    `;
  }).join("");

  if ($("emptyState")) {
    $("emptyState").style.display =
      matches.length ? "none" : "block";
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

  const product = products.find(
    item => Number(item.id) === Number(id)
  );

  if (!product) {
    toast("Product not found");
    return;
  }

  const stock = Number(product.stock ?? 0);

  if (stock <= 0) {
    toast("This product is out of stock");
    return;
  }

  const existing = cart.find(
    item => Number(item.id) === Number(id)
  );

  if (existing) {

    if (existing.qty >= stock) {
      toast("Maximum available stock reached");
      return;
    }

    existing.qty++;

  } else {

    cart.push({
      ...product,
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
    product => Number(product.id) === Number(id)
  );

  if (!item) return;

  const product = products.find(
    product => Number(product.id) === Number(id)
  );

  const stock = product
    ? Number(product.stock ?? 0)
    : Number(item.stock ?? 0);

  item.qty += Number(delta);

  if (item.qty <= 0) {

    cart = cart.filter(
      product => Number(product.id) !== Number(id)
    );

  } else if (stock > 0 && item.qty > stock) {

    item.qty = stock;
    toast("Maximum available stock reached");
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

  if ($("cartTotal")) {
    $("cartTotal").textContent = money(cartTotal());
  }

  if ($("checkoutTotal")) {
    $("checkoutTotal").textContent = money(cartTotal());
  }

  if (!$("cartItems")) return;

  $("cartItems").innerHTML = cart.length

    ? cart.map(item => `

      <div class="cart-item">

        <div class="mini-img">

          ${
            item.image
              ? `<img src="${item.image}" alt="${item.name}">`
              : `PRODUCT<br>IMAGE`
          }

        </div>

        <div>

          <h4>${item.name}</h4>

          <p>${money(item.price)}</p>

          <div class="qty">

            <button
              onclick="changeQty(${item.id}, -1)"
              aria-label="Decrease quantity"
            >
              −
            </button>

            <span>${item.qty}</span>

            <button
              onclick="changeQty(${item.id}, 1)"
              aria-label="Increase quantity"
            >
              +
            </button>

          </div>

        </div>

        <button
          class="remove"
          onclick="changeQty(${item.id}, -${item.qty})"
        >
          Remove
        </button>

      </div>

    `).join("")

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


/* =========================
   SEARCH
========================= */

if ($("searchBtn")) {

  $("searchBtn").onclick = () => {

    if ($("searchPanel")) {
      $("searchPanel").style.display = "block";
    }

    if ($("searchInput")) {
      $("searchInput").focus();
    }

  };

}

if ($("closeSearch")) {

  $("closeSearch").onclick = () => {

    if ($("searchPanel")) {
      $("searchPanel").style.display = "none";
    }

    if ($("searchInput")) {
      $("searchInput").value = "";
    }

    searchTerm = "";

    renderProducts();

  };

}

if ($("searchInput")) {

  $("searchInput").oninput = event => {

    searchTerm = event.target.value
      .toLowerCase()
      .trim();

    renderProducts();

  };

}


/* =========================
   CART BUTTONS
========================= */

if ($("cartBtn")) {
  $("cartBtn").onclick = openCart;
}

if ($("closeCart")) {
  $("closeCart").onclick = closeCart;
}

if ($("overlay")) {
  $("overlay").onclick = closeCart;
}


/* =========================
   MOBILE MENU
========================= */

if ($("menuBtn")) {

  $("menuBtn").onclick = () => {

    if (!$("mobileNav")) return;

    $("mobileNav").style.display =
      $("mobileNav").style.display === "flex"
        ? "none"
        : "flex";

  };

}

document.querySelectorAll(".mobile-nav a").forEach(link => {

  link.onclick = () => {

    if ($("mobileNav")) {
      $("mobileNav").style.display = "none";
    }

  };

});


/* =========================
   CHECKOUT BUTTON
========================= */

if ($("checkoutBtn")) {

  $("checkoutBtn").onclick = () => {

    if (!cart.length) {
      toast("Your cart is empty");
      return;
    }

    window.location.href =
      "checkout/checkout.html";

  };

}


/* =========================
   NEWSLETTER
========================= */

if ($("newsletterForm")) {

  $("newsletterForm").onsubmit = event => {

    event.preventDefault();

    event.target.reset();

    toast("Newsletter form ready for backend integration.");

  };

}


/* =========================
   START
========================= */

loadProducts();
renderCart();