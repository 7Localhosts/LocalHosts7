/**
 * payment.js — Kay's Haven Paystack Payment Integration
 *
 * Flow:
 *  1. Read pending order from localStorage (key: 'kayshaven-pending-order')
 *  2. Render order summary
 *  3. On "Pay Now" click → POST /api/payments/initialize → get access_code
 *  4. Open Paystack inline popup via PaystackPop
 *  5. On popup success → POST /api/payments/verify → show appropriate state
 *  6. On popup close/cancel → show abandoned state
 *
 * Integration note for checkout teammate:
 *   Before redirecting to payment.html, save the order object to localStorage:
 *     localStorage.setItem('kayshaven-pending-order', JSON.stringify({
 *       orderId, customer: { name, email }, items: [...], total
 *     }));
 *   Then: window.location.href = '../payment/payment.html';
 */

'use strict';

// ─── Config ───────────────────────────────────────────────────────────────────
// Update this URL when deploying to production
const API_BASE = 'http://localhost:3000';

// ─── State ────────────────────────────────────────────────────────────────────
let pendingOrder = null;

// ─── DOM refs ─────────────────────────────────────────────────────────────────
const checkoutView = document.getElementById('checkout-view');
const statusScreen = document.getElementById('status-screen');
const orderItemsEl = document.getElementById('order-items');
const subtotalEl   = document.getElementById('summary-subtotal');
const deliveryEl   = document.getElementById('summary-delivery');
const totalEl      = document.getElementById('summary-total');
const payBtn       = document.getElementById('pay-btn');

// ─── Helpers ──────────────────────────────────────────────────────────────────
const money = n => 'GH₵' + Number(n).toFixed(2);

function showToast(msg, type = '') {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = 'toast show' + (type ? ' ' + type : '');
  setTimeout(() => { t.className = 'toast'; }, 3500);
}

// ─── Render order summary ─────────────────────────────────────────────────────
function renderSummary(order) {
  if (!orderItemsEl) return;

  const items = order.items || [];
  const deliveryFee = order.deliveryFee ?? 15;

  orderItemsEl.innerHTML = items.length
    ? items.map(item => `
        <div class="order-item">
          <div>
            <div class="item-name">${item.name}</div>
            <div class="item-qty">Qty: ${item.qty ?? item.quantity ?? 1}</div>
          </div>
          <div>${money(item.price * (item.qty ?? item.quantity ?? 1))}</div>
        </div>
      `).join('')
    : '<p style="color:var(--muted);font-size:13px;">No items found.</p>';

  const subtotal = items.reduce((s, i) => s + i.price * (i.qty ?? i.quantity ?? 1), 0);
  const total    = order.total ?? subtotal + deliveryFee;

  if (subtotalEl) subtotalEl.textContent = money(subtotal);
  if (deliveryEl) deliveryEl.textContent = money(deliveryFee);
  if (totalEl)    totalEl.textContent    = money(total);

  // Show customer name
  const nameEl = document.getElementById('customer-name');
  if (nameEl && order.customer?.name) nameEl.textContent = order.customer.name;
}

// ─── Show a status screen ─────────────────────────────────────────────────────
function showStatus(type, data = {}) {
  if (checkoutView) checkoutView.style.display = 'none';
  if (statusScreen) statusScreen.style.display = 'block';
  statusScreen.innerHTML = buildStatusHTML(type, data);
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function buildStatusHTML(type, data) {
  const configs = {
    success: {
      icon: '✓', iconClass: 'success',
      title: 'Payment successful!',
      body: `Thank you${data.name ? ', ' + data.name : ''}. Your order has been received and is being processed.`,
      extra: data.reference
        ? `<div class="order-ref">Ref: ${data.reference}</div><p style="font-size:12px;color:var(--muted);margin-top:8px;">Keep this reference number for your records.</p>`
        : '',
      actions: `<a href="../index.html" class="btn-secondary">Continue shopping</a>`,
    },
    failed: {
      icon: '✕', iconClass: 'failed',
      title: 'Payment failed',
      body: data.message || 'Your payment could not be processed. Please try a different payment method.',
      extra: '',
      actions: `
        <button class="btn-primary" id="retry-btn">Try again</button>
        <a href="../index.html" class="btn-secondary">Back to shop</a>`,
    },
    abandoned: {
      icon: '⟳', iconClass: 'abandoned',
      title: 'Payment not completed',
      body: 'You closed the payment window before completing the transaction. Your order has not been charged.',
      extra: '',
      actions: `
        <button class="btn-primary" id="retry-btn">Try again</button>
        <a href="../index.html" class="btn-secondary">Back to shop</a>`,
    },
    pending: {
      icon: '⏳', iconClass: 'pending',
      title: 'Payment pending',
      body: "We've received your payment request. We'll notify you via WhatsApp or email once it's confirmed.",
      extra: data.reference ? `<div class="order-ref">Ref: ${data.reference}</div>` : '',
      actions: `<a href="../index.html" class="btn-secondary">Back to shop</a>`,
    },
  };

  const c = configs[type] || configs.abandoned;
  return `
    <div class="status-card">
      <div class="status-icon ${c.iconClass}">${c.icon}</div>
      <h2>${c.title}</h2>
      <p>${c.body}</p>
      ${c.extra}
      <div class="action-row">${c.actions}</div>
    </div>`;
}

// ─── Server-side payment verification ────────────────────────────────────────
// IMPORTANT: Never trust the Paystack popup callback alone.
// We always verify the transaction server-side via our backend which calls
// the Paystack /transaction/verify endpoint with the secret key.
async function verifyPayment(reference) {
  try {
    const res = await fetch(`${API_BASE}/api/payments/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reference }),
    });

    if (!res.ok) throw new Error('Verification request failed');

    const json = await res.json();
    const { paymentStatus, message } = json.data;

    // Clear pending order on any terminal state
    if (['success', 'failed'].includes(paymentStatus)) {
      localStorage.removeItem('kayshaven-pending-order');
    }

    showStatus(paymentStatus, {
      reference,
      message,
      name: pendingOrder?.customer?.name,
    });
  } catch (err) {
    console.error('[verify]', err);
    showStatus('pending', { reference });
  }
}

// ─── Launch Paystack popup ────────────────────────────────────────────────────
async function launchPaystack(order) {
  setPayBtnLoading(true);

  try {
    // Step 1: Initialise transaction on our backend (never on the client directly)
    const initRes = await fetch(`${API_BASE}/api/payments/initialize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email:        order.customer?.email,
        amount:       order.total,
        orderId:      order.orderId,
        customerName: order.customer?.name,
      }),
    });

    if (!initRes.ok) {
      const err = await initRes.json();
      throw new Error(err.error || 'Could not initialise payment.');
    }

    const { data } = await initRes.json();
    const { accessCode, publicKey, reference } = data;

    // Step 2: Open Paystack inline popup using the access_code from the server
    // resumeTransaction ensures the popup uses the server-initialised transaction
    // (correct amount, channels, metadata) rather than client-side params.
    const popup = new PaystackPop();

    popup.resumeTransaction(accessCode, {
      onSuccess: (transaction) => {
        // The popup says "success" — but we verify server-side before trusting it
        setPayBtnLoading(false);
        verifyPayment(transaction.reference || reference);
      },
      onCancel: () => {
        setPayBtnLoading(false);
        showStatus('abandoned');
      },
    });

  } catch (err) {
    console.error('[launchPaystack]', err);
    setPayBtnLoading(false);
    showToast(err.message || 'Payment could not be started. Please try again.', 'error');
  }
}

function setPayBtnLoading(loading) {
  if (!payBtn) return;
  payBtn.disabled = loading;
  payBtn.innerHTML = loading
    ? '<span class="spinner"></span>Opening payment…'
    : 'Pay now with Paystack';
}

// ─── Retry button (attached dynamically after status screen renders) ───────────
document.addEventListener('click', e => {
  if (e.target && e.target.id === 'retry-btn') {
    statusScreen.style.display = 'none';
    if (checkoutView) checkoutView.style.display = '';
    if (pendingOrder) launchPaystack(pendingOrder);
  }
});

// ─── Init ────────────────────────────────────────────────────────────────────
(function init() {
  // Load pending order from localStorage
  try {
    const raw = localStorage.getItem('kayshaven-pending-order');
    pendingOrder = raw ? JSON.parse(raw) : null;
  } catch { pendingOrder = null; }

  if (!pendingOrder) {
    // No order found — show empty state
    if (checkoutView) {
      checkoutView.innerHTML = `
        <div class="empty-state">
          <p>No pending order found.</p>
          <p><a href="../index.html">← Return to the shop</a></p>
        </div>`;
    }
    return;
  }

  renderSummary(pendingOrder);

  if (payBtn) {
    payBtn.addEventListener('click', () => launchPaystack(pendingOrder));
  }
})();
