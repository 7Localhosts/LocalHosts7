/**
 * delivery.js — Kay's Haven Delivery Information Page
 *
 * Fetches delivery config from GET /api/delivery and renders:
 *   - Delivery zones with fees and estimated times
 *   - Pickup locations with hours and contact
 *   - General delivery notes
 */

'use strict';

const API_BASE = 'http://localhost:3000'; // update for production

// ─── Render helpers ───────────────────────────────────────────────────────────
function renderZones(zones) {
  const grid = document.getElementById('zones-grid');
  if (!grid) return;

  grid.innerHTML = zones.map(z => `
    <div class="zone-card">
      <h3>${z.name}</h3>
      <div class="zone-fee">GH₵${z.fee.toFixed(2)}</div>
      <div class="zone-eta">⏱ ${z.estimatedDays}</div>
      <div class="zone-areas">${z.areas.join(' · ')}</div>
    </div>
  `).join('');
}

function renderPickups(locations) {
  const grid = document.getElementById('pickups-grid');
  if (!grid) return;

  grid.innerHTML = locations.map(p => `
    <div class="pickup-card">
      <h3>📍 ${p.name}</h3>
      <p>${p.address}</p>
      <p>${p.hours}</p>
      <a href="${p.whatsapp}" target="_blank" rel="noopener">
        💬 WhatsApp: ${p.phone}
      </a>
    </div>
  `).join('');
}

function renderNotes(notes) {
  const list = document.getElementById('notes-list');
  if (!list) return;
  list.innerHTML = notes.map(n => `<li>${n}</li>`).join('');
}

// ─── Load and render ──────────────────────────────────────────────────────────
async function loadDeliveryInfo() {
  const content = document.getElementById('delivery-content');

  try {
    const res  = await fetch(`${API_BASE}/api/delivery`);
    const json = await res.json();

    if (!res.ok) throw new Error(json.error || 'Failed to load delivery info.');

    const { zones, pickupLocations, notes } = json.data;

    renderZones(zones);
    renderPickups(pickupLocations);
    renderNotes(notes);

    // Hide loading indicator
    const loading = document.getElementById('loading-msg');
    if (loading) loading.style.display = 'none';

  } catch (err) {
    console.error('[loadDeliveryInfo]', err);
    const loading = document.getElementById('loading-msg');
    if (loading) loading.textContent = 'Could not load delivery information. Please refresh or contact us on WhatsApp.';
  }
}

loadDeliveryInfo();
