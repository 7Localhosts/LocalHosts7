const DELIVERY_FEE = 15.00;

const API_URL = "http://localhost:8000/api/orders";


/* =========================
   CART
========================= */

function getCartItems() {
  const stored = localStorage.getItem("kayshaven-cart");

  if (!stored) return [];

  try {
    const cart = JSON.parse(stored);

    return cart.map(item => ({
      id: Number(item.id),
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


/* =========================
   MONEY
========================= */

function money(amount) {
  return `GHS ${Number(amount || 0).toFixed(2)}`;
}


/* =========================
   ORDER SUMMARY
========================= */

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

    const lineTotal =
      Number(item.price) * Number(item.qty);

    subtotal += lineTotal;

    const row =
      document.createElement("div");

    row.className = "order-item";


    const details =
      document.createElement("div");


    const name =
      document.createElement("div");

    name.className = "name";

    name.textContent = item.name;


    const qty =
      document.createElement("div");

    qty.className = "qty";

    qty.textContent =
      `Qty: ${item.qty}`;


    details.append(name, qty);


    const amount =
      document.createElement("div");

    amount.textContent =
      money(lineTotal);


    row.append(details, amount);

    container.appendChild(row);

  });


  const total =
    subtotal + DELIVERY_FEE;


  document.getElementById(
    "summary-subtotal"
  ).textContent = money(subtotal);


  document.getElementById(
    "summary-delivery"
  ).textContent = money(DELIVERY_FEE);


  document.getElementById(
    "summary-total"
  ).textContent = money(total);


  return {
    subtotal,
    total
  };
}


let totals =
  renderOrderSummary();


/* =========================
   PAYMENT METHOD
========================= */

document
  .querySelectorAll('input[name="paymentMethod"]')
  .forEach(radio => {

    radio.addEventListener("change", () => {

      document
        .querySelectorAll(".momo-fields, .card-fields")
        .forEach(element => {
          element.style.display = "none";
        });


      const target =
        document.querySelector(
          `[data-fields-for="${radio.value}"]`
        );


      if (target) {
        target.style.display = "block";
      }

    });

  });


/* =========================
   VALIDATION
========================= */

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

  const errorElement =
    document.querySelector(
      `[data-error-for="${fieldName}"]`
    );


  if (errorElement) {
    errorElement.style.display = "block";
  }


  const inputElement =
    document.getElementById(fieldName);


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


/* =========================
   SEND ORDER TO BACKEND
========================= */

async function submitOrder(order) {

  const response =
    await fetch(API_URL, {

      method: "POST",

      headers: {
        "Content-Type": "application/json"
      },

      body: JSON.stringify(order)

    });


  const result =
    await response.json();


  if (!response.ok) {

    throw new Error(
      result.error ||
      result.message ||
      "Failed to place order"
    );

  }


  return result;
}


/* =========================
   CHECKOUT FORM
========================= */

document
  .getElementById("checkout-form")
  .addEventListener("submit", async function(event) {

    event.preventDefault();


    cartItems = getCartItems();


    if (!cartItems.length) {

      alert(
        "Your cart is empty. Please add a product first."
      );

      return;
    }


    totals =
      renderOrderSummary();


    const formData =
      new FormData(this);


    const data =
      Object.fromEntries(
        formData.entries()
      );


    if (!validateForm(data)) {
      return;
    }


    /*
      The database currently stores one shipping_address
      field, so we combine the address information here.
    */

    const shippingAddress = [
      data.address.trim(),
      data.city.trim(),
      data.region.trim(),
      data.notes
        ? `Notes: ${data.notes.trim()}`
        : ""
    ]
      .filter(Boolean)
      .join(", ");


    const order = {

      customer_name:
        data.fullName.trim(),

      email:
        data.email.trim(),

      shipping_address:
        shippingAddress,

      total_amount:
        totals.total,

      items:
        cartItems.map(item => ({
          product_id: item.id,
          product_name: item.name,
          quantity: item.qty,
          price: item.price
        }))

    };


    const button =
      document.getElementById(
        "place-order-btn"
      );


    button.disabled = true;

    button.textContent =
      "Placing order...";


    try {

      console.log(
        "Sending order:",
        order
      );


      const result =
        await submitOrder(order);


      /*
        Backend may return the order ID
        in different forms.
      */

      const orderId =
        result.orderId ||
        result.order_id ||
        result.order?.id ||
        "Received";


      document.getElementById(
        "conf-name"
      ).textContent =
        data.fullName.trim();


      document.getElementById(
        "conf-email"
      ).textContent =
        data.email.trim();


      document.getElementById(
        "conf-order-id"
      ).textContent =
        `Order #${orderId}`;


      document.getElementById(
        "checkout-view"
      ).style.display =
        "none";


      document.getElementById(
        "confirmation-view"
      ).style.display =
        "block";


      /*
        Clear the customer's cart
        only after the backend confirms
        the order was accepted.
      */

      localStorage.removeItem(
        "kayshaven-cart"
      );


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
        `Could not place order: ${error.message}`
      );


      button.disabled = false;

      button.textContent =
        "Place order";

    }

  });