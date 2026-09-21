/* ------------------------------------------------------------------
     DEMO CART DATA
     This is a placeholder. Replace this with however the Cart teammate's
     work actually exposes the cart — e.g. reading from localStorage
     (localStorage.getItem('cart')) or a shared JS module/state.
  ------------------------------------------------------------------ */
  const DELIVERY_FEE = 15.00;

  function getCartItems() {
    // TODO: swap this for the real cart source once confirmed with the Cart teammate.
    const stored = localStorage.getItem('cart');
    if (stored) {
      try { return JSON.parse(stored); } catch (e) { /* fall through to demo data */ }
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

    cartItems.forEach(item => {
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
    });

    const total = subtotal + DELIVERY_FEE;
    document.getElementById('summary-subtotal').textContent = money(subtotal);
    document.getElementById('summary-delivery').textContent = money(DELIVERY_FEE);
    document.getElementById('summary-total').textContent = money(total);
    return { subtotal, total };
  }

  let totals = renderOrderSummary();

  /* Show/hide extra fields depending on selected payment method */
  document.querySelectorAll('input[name="paymentMethod"]').forEach(radio => {
    radio.addEventListener('change', () => {
      document.querySelectorAll('.momo-fields, .card-fields').forEach(el => el.style.display = 'none');
      const target = document.querySelector(`[data-fields-for="${radio.value}"]`);
      if (target) target.style.display = 'block';
    });
  });

  /* ------------------------------------------------------------------
     VALIDATION
  ------------------------------------------------------------------ */
  function clearErrors() {
    document.querySelectorAll('.error-text').forEach(el => el.style.display = 'none');
    document.querySelectorAll('.field-invalid').forEach(el => el.classList.remove('field-invalid'));
  }

  function showError(fieldName) {
    const errorEl = document.querySelector(`[data-error-for="${fieldName}"]`);
    if (errorEl) errorEl.style.display = 'block';
    const inputEl = document.getElementById(fieldName);
    if (inputEl) inputEl.classList.add('field-invalid');
  }

  function validateForm(data) {
    clearErrors();
    let valid = true;

    if (!data.fullName.trim()) { showError('fullName'); valid = false; }
    if (!/^[0-9+\s-]{7,15}$/.test(data.phone.trim())) { showError('phone'); valid = false; }
    if (!/^\S+@\S+\.\S+$/.test(data.email.trim())) { showError('email'); valid = false; }
    if (!data.address.trim()) { showError('address'); valid = false; }
    if (!data.city.trim()) { showError('city'); valid = false; }
    if (!data.region.trim()) { showError('region'); valid = false; }
    if (!data.paymentMethod) { showError('paymentMethod'); valid = false; }

    return valid;
  }

  /* ------------------------------------------------------------------
     SUBMIT ORDER
     This builds the order object and is where you'll connect to the
     real backend once the API endpoint/format is confirmed.
  ------------------------------------------------------------------ */
  async function submitOrder(order) {
    // TODO: replace with the real endpoint once confirmed with the backend teammate.
    // Example for a Node/Express + JSON API:
    //
    // const response = await fetch('/api/orders', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify(order)
    // });
    // if (!response.ok) throw new Error('Failed to create order');
    // return await response.json();

    // For now: simulate a successful backend response so the flow can be tested end-to-end.
    console.log('Order payload (would be sent to backend):', order);
    await new Promise(resolve => setTimeout(resolve, 600));
    return { orderId: 'MC-' + Date.now().toString().slice(-8), status: 'received' };
  }

  document.getElementById('checkout-form').addEventListener('submit', async function (e) {
    e.preventDefault();

    const formData = new FormData(this);
    const data = Object.fromEntries(formData.entries());

    if (!validateForm(data)) return;

    const order = {
      customer: {
        fullName: data.fullName.trim(),
        phone: data.phone.trim(),
        email: data.email.trim(),
      },
      delivery: {
        address: data.address.trim(),
        city: data.city.trim(),
        region: data.region.trim(),
        notes: data.notes ? data.notes.trim() : '',
      },
      payment: {
        method: data.paymentMethod,
        // NOTE: never send real full card numbers/CVC to your own backend/logs in production.
        // A real integration would tokenize this through the payment provider's SDK instead.
      },
      items: cartItems,
      subtotal: totals.subtotal,
      deliveryFee: DELIVERY_FEE,
      total: totals.total,
      createdAt: new Date().toISOString(),
    };

    const btn = document.getElementById('place-order-btn');
    btn.disabled = true;
    btn.textContent = 'Placing order...';

    try {
      const result = await submitOrder(order);

      document.getElementById('conf-name').textContent = order.customer.fullName;
      document.getElementById('conf-email').textContent = order.customer.email;
      document.getElementById('conf-order-id').textContent = 'Order #' + result.orderId;

      document.getElementById('checkout-view').style.display = 'none';
      document.getElementById('confirmation-view').style.display = 'block';
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      alert('Something went wrong placing your order. Please try again.');
      btn.disabled = false;
      btn.textContent = 'Place order';
    }
  });