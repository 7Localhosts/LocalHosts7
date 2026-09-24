const DELIVERY_FEE = 15.00;


// ========================================
// GET REAL CART
// ========================================

function getCartItems() {
  const stored = localStorage.getItem("kayshaven-cart");

  if (!stored) {
    return [];
  }

  try {
    const cart = JSON.parse(stored);

    return cart.map(item => ({
      id: item.id,
      name: item.name,
      price: Number(item.price),
      qty: Number(item.qty)
    }));

  } catch (error) {
    console.error("Could not read cart:", error);
    return [];
  }
}


let cartItems = getCartItems();


// ========================================
// MONEY FORMAT
// ========================================

function money(amount) {
  return "GH₵" + Number(amount).toFixed(2);
}


// ========================================
// ORDER SUMMARY
// ========================================

function renderOrderSummary() {
  const container = document.getElementById("order-items");

  container.innerHTML = "";

  let subtotal = 0;

  if (!cartItems.length) {
    container.innerHTML = `
      <p>Your cart is empty.</p>
    `;
  }

  cartItems.forEach(item => {

    const lineTotal = item.price * item.qty;

    subtotal += lineTotal;

    const row = document.createElement("div");
    row.className = "order-item";

    const details = document.createElement("div");

    const name = document.createElement("div");
    name.className = "name";
    name.textContent = item.name;

    const qty = document.createElement("div");
    qty.className = "qty";
    qty.textContent = `Qty: ${item.qty}`;

    details.append(name, qty);

    const amount = document.createElement("div");
    amount.textContent = money(lineTotal);

    row.append(details, amount);

    container.appendChild(row);
  });

  const total = subtotal + DELIVERY_FEE;

  document.getElementById("summary-subtotal").textContent =
    money(subtotal);

  document.getElementById("summary-delivery").textContent =
    money(DELIVERY_FEE);

  document.getElementById("summary-total").textContent =
    money(total);

  return {
    subtotal,
    total
  };
}


let totals = renderOrderSummary();


// ========================================
// PAYMENT METHOD FIELDS
// ========================================

document
  .querySelectorAll('input[name="paymentMethod"]')
  .forEach(radio => {

    radio.addEventListener("change", () => {

      document
        .querySelectorAll(".momo-fields, .card-fields")
        .forEach(element => {
          element.style.display = "none";
        });

      const target = document.querySelector(
        `[data-fields-for="${radio.value}"]`
      );

      if (target) {
        target.style.display = "block";
      }
    });

  });


// ========================================
// VALIDATION
// ========================================

function clearErrors() {

  document
    .querySelectorAll(".error-text")
    .forEach(element => {
      element.style.display = "none";
    });

  document
    .querySelectorAll(".field-invalid")
    .forEach(element => {
      element.classList.remove("field-invalid");
    });
}


function showError(fieldName) {

  const errorElement = document.querySelector(
    `[data-error-for="${fieldName}"]`
  );

  if (errorElement) {
    errorElement.style.display = "block";
  }

  const inputElement = document.getElementById(fieldName);

  if (inputElement) {
    inputElement.classList.add("field-invalid");
  }
}


function validateForm(data) {

  clearErrors();

  let valid = true;

  if (!data.fullName.trim()) {
    showError("fullName");
    valid = false;
  }

  if (!/^[0-9+\s-]{7,15}$/.test(data.phone.trim())) {
    showError("phone");
    valid = false;
  }

  if (!/^\S+@\S+\.\S+$/.test(data.email.trim())) {
    showError("email");
    valid = false;
  }

  if (!data.address.trim()) {
    showError("address");
    valid = false;
  }

  if (!data.city.trim()) {
    showError("city");
    valid = false;
  }

  if (!data.region.trim()) {
    showError("region");
    valid = false;
  }

  if (!data.paymentMethod) {
    showError("paymentMethod");
    valid = false;
  }

  return valid;
}


// ========================================
// SUBMIT ORDER
// ========================================

async function submitOrder(order) {

  console.log(
    "Order payload:",
    order
  );

  await new Promise(resolve =>
    setTimeout(resolve, 600)
  );

  return {
    orderId:
      "KH-" +
      Date.now().toString().slice(-8),

    status: "received"
  };
}


// ========================================
// CHECKOUT FORM
// ========================================

document
  .getElementById("checkout-form")
  .addEventListener("submit", async function (event) {

    event.preventDefault();

    // Refresh cart in case something changed
    // before reaching checkout.
    cartItems = getCartItems();

    if (!cartItems.length) {

      alert(
        "Your cart is empty. Please add a product first."
      );

      return;
    }

    totals = renderOrderSummary();

    const formData =
      new FormData(this);

    const data =
      Object.fromEntries(formData.entries());

    if (!validateForm(data)) {
      return;
    }

    const order = {

      customer: {
        fullName: data.fullName.trim(),
        phone: data.phone.trim(),
        email: data.email.trim()
      },

      delivery: {
        address: data.address.trim(),
        city: data.city.trim(),
        region: data.region.trim(),
        notes: data.notes
          ? data.notes.trim()
          : ""
      },

      payment: {
        method: data.paymentMethod
      },

      items: cartItems,

      subtotal: totals.subtotal,

      deliveryFee: DELIVERY_FEE,

      total: totals.total,

      createdAt:
        new Date().toISOString()
    };


    const button =
      document.getElementById("place-order-btn");

    button.disabled = true;

    button.textContent =
      "Placing order...";


    try {

      const result =
        await submitOrder(order);


      document.getElementById(
        "conf-name"
      ).textContent =
        order.customer.fullName;


      document.getElementById(
        "conf-email"
      ).textContent =
        order.customer.email;


      document.getElementById(
        "conf-order-id"
      ).textContent =
        "Order #" +
        result.orderId;


      document.getElementById(
        "checkout-view"
      ).style.display =
        "none";


      document.getElementById(
        "confirmation-view"
      ).style.display =
        "block";


      window.scrollTo({
        top: 0,
        behavior: "smooth"
      });


    } catch (error) {

      console.error(
        "Order submission failed:",
        error
      );

      alert(
        "Something went wrong placing your order. Please try again."
      );

      button.disabled = false;

      button.textContent =
        "Place order";
    }

  });