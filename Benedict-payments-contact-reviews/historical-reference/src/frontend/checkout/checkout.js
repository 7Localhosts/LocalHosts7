'use strict';

// ─── Config ───────────────────────────────────────────────────────────────────
// Matches the same pattern used by payment.js so both pages point to the same
// backend automatically (set window.KH_API_BASE before this script in prod).
const API_BASE = window.KH_API_BASE || 'http://localhost:3000';
const DELIVERY_FEE = 15;

// ─── Load cart from localStorage ─────────────────────────────────────────────
let cart = [];
try {
    const raw = localStorage.getItem('kayshaven-cart');
    cart = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(cart)) cart = [];
} catch { cart = []; }

// ─── Wizard elements ──────────────────────────────────────────────────────────
const step1    = document.getElementById('step-1');
const step2    = document.getElementById('step-2');
const step1Ind = document.getElementById('step1-indicator');
const step2Ind = document.getElementById('step2-indicator');
const btnNext  = document.getElementById('btn-next');
const btnBack  = document.getElementById('btn-back');

// ─── Step navigation ──────────────────────────────────────────────────────────
btnNext.addEventListener('click', () => {
    if (cart.length === 0) return; // belt-and-braces; button is also disabled
    step1.classList.remove('active-step');
    step2.classList.add('active-step');
    step1Ind.classList.remove('active');
    step2Ind.classList.add('active');
});

btnBack.addEventListener('click', () => {
    step2.classList.remove('active-step');
    step1.classList.add('active-step');
    step2Ind.classList.remove('active');
    step1Ind.classList.add('active');
});

// ─── Render cart ──────────────────────────────────────────────────────────────
function renderCart() {
    const cartItemsEl  = document.getElementById('cart-items');
    const subtotalEl   = document.getElementById('subtotal');
    const totalEl      = document.getElementById('total');
    const deliveryEl   = document.getElementById('delivery-fee');

    if (deliveryEl) deliveryEl.textContent = `GH₵ ${DELIVERY_FEE.toFixed(2)}`;

    if (cart.length === 0) {
        cartItemsEl.innerHTML = `
            <div class="empty-cart">
                <p>Your cart is empty.</p>
                <a href="../index.html">← Return to shop</a>
            </div>`;
        subtotalEl.textContent = 'GH₵ 0.00';
        totalEl.textContent    = `GH₵ ${DELIVERY_FEE.toFixed(2)}`;
        btnNext.disabled       = true;
        return;
    }

    let subtotal = 0;
    let html     = '';

    cart.forEach(item => {
        const qty       = Number(item.qty || item.quantity || 1);
        const itemTotal = item.price * qty;
        subtotal += itemTotal;
        html += `
            <div class="cart-item">
                <div class="item-details">
                    <h4>${item.name}</h4>
                    <p>Qty: ${qty}</p>
                </div>
                <div class="item-price">GH₵ ${itemTotal.toFixed(2)}</div>
            </div>`;
    });

    cartItemsEl.innerHTML  = html;
    subtotalEl.textContent = `GH₵ ${subtotal.toFixed(2)}`;
    totalEl.textContent    = `GH₵ ${(subtotal + DELIVERY_FEE).toFixed(2)}`;
}

// ─── Form submit → persist order → hand off to payment ───────────────────────
document.getElementById('checkout-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    const submitBtn         = e.target.querySelector('button[type="submit"]');
    submitBtn.disabled      = true;
    submitBtn.textContent   = 'Processing…';

    const fullName = document.getElementById('fullName').value.trim();
    const email    = document.getElementById('email').value.trim();
    const phone    = document.getElementById('phone').value.trim();
    const address  = document.getElementById('address').value.trim();

    const subtotal = cart.reduce(
        (sum, item) => sum + item.price * Number(item.qty || item.quantity || 1), 0
    );
    const total = subtotal + DELIVERY_FEE;

    // 1. Persist order to backend (non-fatal: payment must not be blocked if the
    //    backend is temporarily unreachable — Paystack verification will still work)
    try {
        await fetch(`${API_BASE}/api/orders`, {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({
                customerName:    fullName,
                email,
                shippingAddress: address,
                cart: cart.map(item => ({
                    id:       item.id,
                    name:     item.name,
                    price:    item.price,
                    quantity: Number(item.qty || item.quantity || 1),
                })),
            }),
        });
    } catch (err) {
        console.warn('[checkout] Order persist failed (non-fatal):', err);
    }

    // 2. Build the handoff payload that payment.js reads from localStorage
    const pendingOrder = {
        orderId:         'KH-' + Date.now().toString().slice(-8),
        customer:        { name: fullName, email },
        phone,
        shippingAddress: address,
        items:           cart,
        deliveryFee:     DELIVERY_FEE,
        total,
    };

    localStorage.setItem('kayshaven-pending-order', JSON.stringify(pendingOrder));
    window.location.href = '../payment/payment.html';
});

// ─── Init ─────────────────────────────────────────────────────────────────────
renderCart();
