/**
 * contact.js — Kay's Haven Contact Page
 *
 * Handles the contact form: validates inputs then POSTs to /api/contact.
 * Shows toast feedback on success or error.
 */

'use strict';

const API_BASE = 'http://localhost:3000'; // update for production

// ─── Toast helper ─────────────────────────────────────────────────────────────
function showToast(msg, type = '') {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = 'toast show' + (type ? ' ' + type : '');
  setTimeout(() => { t.className = 'toast'; }, 3800);
}

// ─── Inline validation helpers ────────────────────────────────────────────────
function clearErrors() {
  document.querySelectorAll('.error-text').forEach(el => el.style.display = 'none');
  document.querySelectorAll('.field-invalid').forEach(el => el.classList.remove('field-invalid'));
}

function showError(fieldId, msgId) {
  const input = document.getElementById(fieldId);
  const msg   = document.getElementById(msgId);
  if (input) input.classList.add('field-invalid');
  if (msg)   msg.style.display = 'block';
}

function validate(data) {
  clearErrors();
  let ok = true;

  if (!data.name.trim()) { showError('name', 'err-name'); ok = false; }
  if (!/^\S+@\S+\.\S+$/.test(data.email.trim())) { showError('email', 'err-email'); ok = false; }
  if (!data.message.trim()) { showError('message', 'err-message'); ok = false; }
  if (data.message.trim().length > 2000) { showError('message', 'err-message-long'); ok = false; }

  return ok;
}

// ─── Form submit ──────────────────────────────────────────────────────────────
const form = document.getElementById('contact-form');
const btn  = document.getElementById('submit-btn');

if (form) {
  form.addEventListener('submit', async function (e) {
    e.preventDefault();

    const fd = new FormData(this);
    const data = Object.fromEntries(fd.entries());

    if (!validate(data)) return;

    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span>Sending…';

    try {
      const res = await fetch(`${API_BASE}/api/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name:    data.name.trim(),
          email:   data.email.trim(),
          phone:   data.phone?.trim() || '',
          subject: data.subject?.trim() || 'Contact Form Enquiry',
          message: data.message.trim(),
        }),
      });

      const json = await res.json();

      if (!res.ok) throw new Error(json.error || 'Submission failed.');

      showToast('Message sent! We'll get back to you within 24 hours. 🙏', 'success');
      form.reset();
    } catch (err) {
      console.error('[contact]', err);
      showToast(err.message || 'Something went wrong. Please try again.', 'error');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Send message';
    }
  });
}
