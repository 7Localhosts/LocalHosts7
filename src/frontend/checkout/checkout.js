// checkout page logic
// handles the cart display, form validation and sending the order to the backend

const DELIVERY_FEE = 15.00;

// get cart items from localStorage (set by the cart page)
// if nothing is there yet, just use some sample items so the page still works
function getCartItems() {
  const stored = localStorage.getItem('cart');
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch (e) {
      console.log('could not parse cart from localStorage, using demo items');
    }
  }

  return [
    { productId: 'demo-1', name: 'Baby Wrap Carrier', price: 180.00, quantity: 1 },
    { productId: 'demo-2', name: 'Newborn Onesie Set (3-pack)', price: 95.00, quantity: 2 },
  ];
}

const cartItems = getCartItems();

function money(n) {
  return 'GH₵' + n.toFixed(2);
}

function renderOrderSummary() {
  const container = document.getElementById('order-items');
  container.innerHTML = '';
  let subtotal = 0;

  for (const item of cartItems) {
    const lineTotal = item.price * item.quantity;
    subtotal += lineTotal;

    const row = document.createElement('div');
    row.className = 'order-item';
    row.innerHTML = `
      <div>
        <div class="name">${item.name}</div>
        <div class="qty">Qty: ${item.quantity}</div>
      </div>
      <div>${money(lineTotal)}</div>
    `;
    container.appendChild(row);
  }

  const total = subtotal + DELIVERY_FEE;

  document.getElementById('summary-subtotal').textContent = money(subtotal);
  document.getElementById('summary-delivery').textContent = money(DELIVERY_FEE);
  document.getElementById('summary-total').textContent = money(total);

  return { subtotal, total };
}

let totals = renderOrderSummary();

// show/hide the momo or card fields depending on which payment option is picked
const paymentRadios = document.querySelectorAll('input[name="paymentMethod"]');
for (const radio of paymentRadios) {
  radio.addEventListener('change', function () {
    document.querySelectorAll('.momo-fields, .card-fields').forEach(el => {
      el.style.display = 'none';
    });

    const target = document.querySelector('[data-fields-for="' + radio.value + '"]');
    if (target) {
      target.style.display = 'block';
    }
  });
}

// --- validation ---

function clearErrors() {
  document.querySelectorAll('.error-text').forEach(el => el.style.display = 'none');
  document.querySelectorAll('.field-invalid').forEach(el => el.classList.remove('field-invalid'));
}

function showError(fieldName) {
  const errorEl = document.querySelector('[data-error-for="' + fieldName + '"]');
  if (errorEl) errorEl.style.display = 'block';

  const inputEl = document.getElementById(fieldName);
  if (inputEl) inputEl.classList.add('field-invalid');
}

function validateForm(data) {
  clearErrors();
  let valid = true;

  if (!data.fullName.trim()) {
    showError('fullName');
    valid = false;
  }

  if (!/^[0-9+\s-]{7,15}$/.test(data.phone.trim())) {
    showError('phone');
    valid = false;
  }

  if (!/^\S+@\S+\.\S+$/.test(data.email.trim())) {
    showError('email');
    valid = false;
  }

  if (!data.address.trim()) {
    showError('address');
    valid = false;
  }

  if (!data.city.trim()) {
    showError('city');
    valid = false;
  }

  if (!data.region.trim()) {
    showError('region');
    valid = false;
  }

  if (!data.paymentMethod) {
    showError('paymentMethod');
    valid = false;
  }

  return valid;
}

// sends the order to the backend
// backend route: POST http://localhost:8000/api/orders
// it expects { customerName, email, shippingAddress, cart }
// and sends back { message, order } if it worked, or { error } if not
async function submitOrder(payload) {
  const response = await fetch('http://localhost:8000/api/orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  let result = {};
  try {
    result = await response.json();
  } catch (e) {
    // in case the server didn't send back valid json
  }

  if (!response.ok) {
    throw new Error(result.error || 'Failed to create order');
  }

  return result;
}

const checkoutForm = document.getElementById('checkout-form');

checkoutForm.addEventListener('submit', async function (e) {
  e.preventDefault();

  const formData = new FormData(checkoutForm);
  const data = Object.fromEntries(formData.entries());

  if (!validateForm(data)) {
    return;
  }

  // backend only has one field for the address, so we combine everything into one string
  let fullAddress = data.address.trim() + ', ' + data.city.trim() + ', ' + data.region.trim();
  if (data.notes && data.notes.trim()) {
    fullAddress += ' — ' + data.notes.trim();
  }

  const order = {
    customerName: data.fullName.trim(),
    email: data.email.trim(),
    shippingAddress: fullAddress,
    cart: cartItems.map(function (item) {
      return {
        id: item.productId,
        name: item.name,
        price: item.price,
        quantity: item.quantity
      };
    })
  };

  const btn = document.getElementById('place-order-btn');
  btn.disabled = true;
  btn.textContent = 'Placing order...';

  try {
    const result = await submitOrder(order);

    document.getElementById('conf-name').textContent = order.customerName;
    document.getElementById('conf-email').textContent = order.email;
    document.getElementById('conf-order-id').textContent = 'Order #' + result.order.id;

    document.getElementById('checkout-view').style.display = 'none';
    document.getElementById('confirmation-view').style.display = 'block';
    window.scrollTo({ top: 0, behavior: 'smooth' });

  } catch (err) {
    alert('Something went wrong placing your order. Please try again.');
    btn.disabled = false;
    btn.textContent = 'Place order';
  }
});