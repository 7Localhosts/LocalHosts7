/**
 * reviews.js — Kay's Haven Customer Reviews
 *
 * - Reads ?productId=X from the URL (falls back to 'general')
 * - GET  /api/reviews/:productId  → loads and renders existing reviews + average
 * - POST /api/reviews             → submits a new review with client-side validation
 *
 * Validation (mirrors server rules):
 *   - name    : required, non-empty
 *   - rating  : 1–5 integer (star input)
 *   - comment : required, ≤ 1000 characters
 */

'use strict';

const API_BASE = 'http://localhost:3000'; // update for production

// ─── Resolve product ID from URL param ────────────────────────────────────────
const params    = new URLSearchParams(window.location.search);
const productId = params.get('productId') || 'general';

// Update heading to show product context
const productLabel = document.getElementById('product-label');
if (productLabel) productLabel.textContent = `Product #${productId}`;

// ─── Helpers ──────────────────────────────────────────────────────────────────
function stars(rating, size = 16) {
  return Array.from({ length: 5 }, (_, i) =>
    `<span style="color:${i < rating ? '#f59e0b' : '#ddd'};font-size:${size}px">★</span>`
  ).join('');
}

function timeAgo(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins  = Math.floor(diff / 60000);
  if (mins < 1)   return 'just now';
  if (mins < 60)  return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)   return `${hrs}h ago`;
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function showToast(msg, type = '') {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = 'toast show' + (type ? ' ' + type : '');
  setTimeout(() => { t.className = 'toast'; }, 3500);
}

// ─── Render reviews list ──────────────────────────────────────────────────────
function renderReviews(data) {
  const list    = document.getElementById('reviews-list');
  const avgNum  = document.getElementById('avg-number');
  const avgStar = document.getElementById('avg-stars');
  const avgCnt  = document.getElementById('avg-count');

  if (avgNum)  avgNum.textContent  = data.count ? data.average.toFixed(1) : '—';
  if (avgStar) avgStar.innerHTML   = data.count ? stars(Math.round(data.average), 26) : '☆☆☆☆☆';
  if (avgCnt)  avgCnt.textContent  = `${data.count} review${data.count !== 1 ? 's' : ''}`;

  if (!list) return;

  if (!data.count) {
    list.innerHTML = '<div class="empty-state">No reviews yet — be the first!</div>';
    return;
  }

  list.innerHTML = data.reviews.map(r => `
    <div class="review-card">
      <div class="review-card-header">
        <div class="reviewer">${escapeHTML(r.name)}</div>
        <div class="date">${timeAgo(r.createdAt)}</div>
      </div>
      <div class="stars">${stars(r.rating)}</div>
      <div class="comment">${escapeHTML(r.comment)}</div>
    </div>
  `).join('');
}

function escapeHTML(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ─── Load reviews from backend ────────────────────────────────────────────────
async function loadReviews() {
  const list = document.getElementById('reviews-list');
  if (list) list.innerHTML = '<div class="empty-state">Loading reviews…</div>';

  try {
    const res  = await fetch(`${API_BASE}/api/reviews/${encodeURIComponent(productId)}`);
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Failed to load reviews.');
    renderReviews(json.data);
  } catch (err) {
    console.error('[loadReviews]', err);
    if (list) list.innerHTML = '<div class="empty-state">Could not load reviews. Please refresh.</div>';
  }
}

// ─── Client-side validation ───────────────────────────────────────────────────
function getSelectedRating() {
  const checked = document.querySelector('input[name="rating"]:checked');
  return checked ? Number(checked.value) : null;
}

function clearErrors() {
  document.querySelectorAll('.error-text').forEach(el => el.style.display = 'none');
  document.querySelectorAll('.field-invalid').forEach(el => el.classList.remove('field-invalid'));
}

function showFieldError(fieldId, errId) {
  const input = document.getElementById(fieldId);
  const err   = document.getElementById(errId);
  if (input) input.classList.add('field-invalid');
  if (err)   err.style.display = 'block';
}

function validateForm(data) {
  clearErrors();
  let ok = true;

  if (!data.name.trim()) { showFieldError('reviewer-name', 'err-name'); ok = false; }

  if (!data.rating) {
    const errEl = document.getElementById('err-rating');
    if (errEl) errEl.style.display = 'block';
    ok = false;
  }

  if (!data.comment.trim()) { showFieldError('review-comment', 'err-comment'); ok = false; }
  else if (data.comment.trim().length > 1000) { showFieldError('review-comment', 'err-comment-long'); ok = false; }

  return ok;
}

// ─── Character counter ────────────────────────────────────────────────────────
const commentInput = document.getElementById('review-comment');
const charCount    = document.getElementById('char-count');
if (commentInput && charCount) {
  commentInput.addEventListener('input', () => {
    const len = commentInput.value.length;
    charCount.textContent = `${len} / 1000`;
    charCount.style.color = len > 900 ? '#c0392b' : '';
  });
}

// ─── Submit review ────────────────────────────────────────────────────────────
const reviewForm = document.getElementById('review-form');
const submitBtn  = document.getElementById('review-submit-btn');

if (reviewForm) {
  reviewForm.addEventListener('submit', async function (e) {
    e.preventDefault();

    const data = {
      name:    (document.getElementById('reviewer-name')?.value || ''),
      rating:  getSelectedRating(),
      comment: (document.getElementById('review-comment')?.value || ''),
    };

    if (!validateForm(data)) return;

    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="spinner"></span>Posting…';

    try {
      const res = await fetch(`${API_BASE}/api/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId,
          name:    data.name.trim(),
          rating:  data.rating,
          comment: data.comment.trim(),
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.details?.join(' ') || json.error || 'Could not post review.');

      showToast('Review posted! Thank you 🌟', 'success');
      reviewForm.reset();
      if (charCount) charCount.textContent = '0 / 1000';

      // Reload reviews to show the new entry
      await loadReviews();
    } catch (err) {
      console.error('[submitReview]', err);
      showToast(err.message || 'Something went wrong. Please try again.', 'error');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Post review';
    }
  });
}

// ─── Init ─────────────────────────────────────────────────────────────────────
loadReviews();
