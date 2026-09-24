const products = [
  {id:1,name:"Baby Cotton Bodysuit",category:"Baby",price:85,badge:"NEW"},
  {id:2,name:"Newborn Essentials Set",category:"Baby",price:180,badge:"POPULAR"},
  {id:3,name:"Toddler Outfit Set",category:"Toddler",price:145,badge:""},
  {id:4,name:"Kids Casual Dress",category:"Kids",price:160,badge:""},
  {id:5,name:"Kids Sneakers",category:"Kids",price:220,badge:"BESTSELLER"},
  {id:6,name:"Teen Backpack",category:"Teens",price:250,badge:""},
  {id:7,name:"Plush Teddy Bear",category:"Toys",price:95,badge:""},
  {id:8,name:"Hair Accessories Set",category:"Accessories",price:55,badge:""},
  {id:9,name:"School Backpack",category:"Back to School",price:220,badge:"BACK TO SCHOOL"},
  {id:10,name:"Lunch Bag",category:"Back to School",price:90,badge:""},
  {id:11,name:"Stationery Set",category:"Back to School",price:75,badge:""},
  {id:12,name:"Clearance Kids Top",category:"Clearance",price:45,badge:"SALE"}
];

let cart = JSON.parse(localStorage.getItem("kayshaven-cart") || "[]");
let currentFilter = "All";
let searchTerm = "";

const $ = id => document.getElementById(id);
const money = n => `GHS ${Number(n).toFixed(2)}`;


/* =========================
   PRODUCTS
========================= */

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

      <a
        href="products/product.html?id=${product.id}"
        class="product-link"
      >

        <div class="product-image">

          ${
            product.badge
              ? `<span class="product-badge">${product.badge}</span>`
              : ""
          }

          <div class="placeholder">
            ADD<br>PRODUCT IMAGE
          </div>

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
      >
        +
      </button>

    </article>
  `).join("");

  $("emptyState").style.display =
    matches.length ? "none" : "block";
}


/* =========================
   CART
========================= */

function saveCart() {

  localStorage.setItem(
    "kayshaven-cart",
    JSON.stringify(cart)
  );

}


function cartCount() {

  return cart.reduce(
    (sum, item) =>
      sum + (Number(item.quantity) || 0),
    0
  );

}


function cartTotal() {

  return cart.reduce(
    (sum, item) =>
      sum +
      Number(item.price) *
      (Number(item.quantity) || 0),
    0
  );

}


/* =========================
   ADD TO CART
========================= */

function addToCart(id) {

  const product =
    products.find(item => item.id === id);

  if (!product) {
    return;
  }

  const existing =
    cart.find(item =>
      item.id === id &&
      (!item.size || item.size === "Not selected")
    );

  if (existing) {

    existing.quantity =
      (Number(existing.quantity) || 0) + 1;

  } else {

    cart.push({

      ...product,

      quantity: 1,

      size: "Not selected"

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

  const item =
    cart.find(product => product.id === id);

  if (!item) {
    return;
  }

  item.quantity =
    (Number(item.quantity) || 0) + delta;

  if (item.quantity <= 0) {

    cart =
      cart.filter(product => product.id !== id);

  }

  saveCart();

  renderCart();

}


/* =========================
   RENDER CART DRAWER
========================= */

function renderCart() {

  $("cartCount").textContent =
    cartCount();

  $("cartTotal").textContent =
    money(cartTotal());

  $("checkoutTotal").textContent =
    money(cartTotal());


  $("cartItems").innerHTML = cart.length

    ? cart.map(item => `

      <div class="cart-item">

        <div class="mini-img">
          PRODUCT<br>IMAGE
        </div>

        <div>

          <h4>${item.name}</h4>

          <p>${money(item.price)}</p>

          ${
            item.size &&
            item.size !== "Not selected"
              ? `<p>Size: ${item.size}</p>`
              : ""
          }

          <div class="qty">

            <button
              onclick="changeQty(${item.id}, -1)"
            >
              −
            </button>

            <span>
              ${Number(item.quantity) || 1}
            </span>

            <button
              onclick="changeQty(${item.id}, 1)"
            >
              +
            </button>

          </div>

        </div>

        <button
          class="remove"
          onclick="changeQty(
            ${item.id},
            -${Number(item.quantity) || 1}
          )"
        >
          Remove
        </button>

      </div>

    `).join("")

    : `

      <div class="empty-cart">

        <p>Your cart is empty.</p>

        <p>
          Add something from the shop
          to get started.
        </p>

      </div>

    `;
}


/* =========================
   CART DRAWER
========================= */

function openCart() {

  $("cartDrawer").classList.add("open");

  $("overlay").classList.add("show");

}


function closeCart() {

  $("cartDrawer").classList.remove("open");

  $("overlay").classList.remove("show");

}


/* =========================
   TOAST
========================= */

function toast(message) {

  const element =
    $("toast");

  element.textContent =
    message;

  element.classList.add("show");

  setTimeout(() => {

    element.classList.remove("show");

  }, 2200);

}


/* =========================
   FILTERS
========================= */

document
  .querySelectorAll(".filter")
  .forEach(button => {

    button.addEventListener("click", () => {

      document
        .querySelectorAll(".filter")
        .forEach(item => {

          item.classList.remove("active");

        });

      button.classList.add("active");

      currentFilter =
        button.dataset.filter;

      renderProducts();

    });

  });


/* =========================
   CATEGORY CARDS
========================= */

document
  .querySelectorAll(".category-card")
  .forEach(button => {

    button.addEventListener("click", () => {

      currentFilter =
        button.dataset.category;

      document
        .querySelectorAll(".filter")
        .forEach(item => {

          item.classList.toggle(
            "active",
            item.dataset.filter === currentFilter
          );

        });

      renderProducts();

      location.hash = "shop";

    });

  });


/* =========================
   SEARCH
========================= */

$("searchBtn").onclick = () => {

  $("searchPanel").style.display =
    "block";

  $("searchInput").focus();

};


$("closeSearch").onclick = () => {

  $("searchPanel").style.display =
    "none";

  $("searchInput").value =
    "";

  searchTerm =
    "";

  renderProducts();

};


$("searchInput").oninput = event => {

  searchTerm =
    event.target.value
      .toLowerCase()
      .trim();

  renderProducts();

};


/* =========================
   MENU
========================= */

$("cartBtn").onclick =
  openCart;

$("closeCart").onclick =
  closeCart;

$("overlay").onclick =
  closeCart;


$("menuBtn").onclick = () => {

  $("mobileNav").style.display =
    $("mobileNav").style.display === "flex"
      ? "none"
      : "flex";

};


document
  .querySelectorAll(".mobile-nav a")
  .forEach(link => {

    link.onclick = () => {

      $("mobileNav").style.display =
        "none";

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

  closeCart();

  $("checkoutModal")
    .classList
    .add("show");

};


$("closeCheckout").onclick = () => {

  $("checkoutModal")
    .classList
    .remove("show");

};


$("checkoutModal").addEventListener(
  "click",
  event => {

    if (
      event.target ===
      $("checkoutModal")
    ) {

      $("checkoutModal")
        .classList
        .remove("show");

    }

  }
);


/* =========================
   CHECKOUT FORM
========================= */

$("checkoutForm").onsubmit =
  event => {

    event.preventDefault();

    const customer =
      Object.fromEntries(
        new FormData(event.target)
      );

    const order = {

      orderNumber:
        "KH-" +
        Date.now()
          .toString()
          .slice(-6),

      customer,

      items: cart,

      total: cartTotal()

    };

    console.log(
      "BACKEND PAYLOAD:",
      order
    );


    cart = [];

    saveCart();

    renderCart();

    event.target.reset();


    $("checkoutModal")
      .classList
      .remove("show");


    toast(
      `Order ${order.orderNumber} created — connect this to your backend.`
    );

  };


/* =========================
   NEWSLETTER
========================= */

$("newsletterForm").onsubmit =
  event => {

    event.preventDefault();

    event.target.reset();

    toast(
      "Newsletter form ready for backend integration."
    );

  };


/* =========================
   INITIALIZE
========================= */

renderProducts();

renderCart();