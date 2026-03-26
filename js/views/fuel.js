// fuel.js — Gas fill-up view

import { store } from '../store.js';
import { createFuel, validateFuel } from '../models.js';
import { formatDisplay, today } from '../utils/dates.js';
import { computeMPG } from '../utils/calculations.js';
import { showToast, showConfirm } from '../app.js';

let editingId = null;
let currentPage = 1;
const PAGE_SIZE = 25;

export function renderFuelView(options = {}) {
  if (options.editId) editingId = options.editId;
  const el = document.getElementById('view-fuel');
  const settings = store.getSettings();

  el.innerHTML = `
    <div class="view-header">
      <h1 class="view-title">Fuel Log</h1>
    </div>
    <div class="split-view">
      <div class="split-form" id="fuel-form-panel">
        ${renderFuelForm(editingId, settings)}
      </div>
      <div class="split-history">
        ${renderFuelHistory(settings)}
      </div>
    </div>
  `;

  bindFuelFormEvents(settings);
  bindFuelHistoryEvents();
}

function renderFuelForm(editId, settings) {
  const record = editId ? store.getById('fuel', editId) : null;
  const isEdit = !!record;
  const r = record || {};

  return `
    <div class="form-card">
      <h2 class="form-title">${isEdit ? 'Edit Fill-Up' : 'Log Fuel Fill-Up'}</h2>
      <form id="fuel-form" novalidate>
        <div class="form-group">
          <label for="fuel-date">Date</label>
          <input type="date" id="fuel-date" name="date" value="${r.date || today()}" required>
        </div>

        <div class="form-group">
          <label for="fuel-odometer">Odometer Reading</label>
          <input type="number" id="fuel-odometer" name="odometer" min="0" step="1"
            value="${r.odometer || ''}" placeholder="e.g. 45250">
        </div>

        <div class="form-row">
          <div class="form-group">
            <label for="fuel-gallons">Gallons <span class="required">*</span></label>
            <input type="number" id="fuel-gallons" name="gallons" min="0.001" step="0.001"
              value="${r.gallons || ''}" placeholder="e.g. 12.345" required>
          </div>
          <div class="form-group">
            <label for="fuel-ppg">Price / Gallon <span class="required">*</span></label>
            <input type="number" id="fuel-ppg" name="pricePerGallon" min="0.001" step="0.001"
              value="${r.pricePerGallon || ''}" placeholder="e.g. 3.859" required>
          </div>
        </div>

        <div class="form-group">
          <label for="fuel-total">Total Cost</label>
          <div class="input-computed">
            <input type="number" id="fuel-total" name="totalCost" min="0" step="0.01"
              value="${r.totalCost || ''}" placeholder="Auto-calculated">
            <span class="input-hint">Auto-fills when gallons × price</span>
          </div>
        </div>

        <div class="form-group">
          <label for="fuel-station">Station / Location</label>
          <input type="text" id="fuel-station" name="station"
            value="${r.station || ''}" placeholder="e.g. Shell on Main St">
        </div>

        <div class="form-group">
          <label>
            <input type="checkbox" id="full-tank" ${r.isFullTank !== false ? 'checked' : ''}>
            Filled to full tank (used for MPG calculation)
          </label>
        </div>

        <div class="form-group">
          <label for="fuel-notes">Notes</label>
          <textarea id="fuel-notes" name="notes" rows="2"
            placeholder="Optional notes">${r.notes || ''}</textarea>
        </div>

        <div class="form-errors hidden" id="fuel-errors"></div>

        <div class="form-actions">
          <button type="submit" class="btn btn-primary">${isEdit ? 'Update Fill-Up' : 'Save Fill-Up'}</button>
          ${isEdit
            ? `<button type="button" class="btn btn-outline" id="cancel-fuel-edit">Cancel</button>`
            : `<button type="button" class="btn btn-ghost" id="clear-fuel-form">Clear</button>`}
        </div>
      </form>
    </div>
  `;
}

function renderFuelHistory(settings) {
  const allFuel = store.getAll('fuel').sort((a,b) => b.date.localeCompare(a.date));
  const mpgMap = computeMPG([...allFuel].sort((a,b) => a.date.localeCompare(b.date)));

  const totalPages = Math.max(1, Math.ceil(allFuel.length / PAGE_SIZE));
  const page = Math.min(currentPage, totalPages);
  const paged = allFuel.slice((page-1)*PAGE_SIZE, page*PAGE_SIZE);

  const totalCost = allFuel.reduce((s,f) => s + (f.totalCost||0), 0);
  const totalGallons = allFuel.reduce((s,f) => s + (f.gallons||0), 0);

  return `
    <div class="history-panel">
      <div class="history-header">
        <h2>Fuel History <span class="count-badge">${allFuel.length}</span></h2>
      </div>

      ${allFuel.length > 0 ? `
        <div class="summary-bar">
          <span>Total Cost: <strong>$${totalCost.toFixed(2)}</strong></span>
          <span>Total Gallons: <strong>${totalGallons.toFixed(3)}</strong></span>
        </div>
      ` : ''}

      ${paged.length === 0 ? `
        <div class="empty-state">
          <p>No fuel logged yet. Log your first fill-up on the left!</p>
        </div>
      ` : `
        <div class="table-scroll">
          <table class="data-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Odometer</th>
                <th>Gallons</th>
                <th>PPG</th>
                <th>Total</th>
                <th>MPG</th>
                <th>Station</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              ${paged.map(f => `
                <tr data-id="${f.id}">
                  <td class="nowrap">${formatDisplay(f.date, settings.dateFormat)}</td>
                  <td>${f.odometer ? f.odometer.toLocaleString() : '—'}</td>
                  <td>${f.gallons?.toFixed(3)}</td>
                  <td>$${f.pricePerGallon?.toFixed(3)}</td>
                  <td><strong>$${f.totalCost?.toFixed(2)}</strong></td>
                  <td>${mpgMap[f.id] ? `<span class="mpg-badge">${mpgMap[f.id]}</span>` : '—'}</td>
                  <td class="text-muted">${f.station || '—'}</td>
                  <td class="actions-cell">
                    <button class="btn-icon edit-fuel-btn" data-id="${f.id}" title="Edit">✏️</button>
                    <button class="btn-icon delete-fuel-btn" data-id="${f.id}" title="Delete">🗑️</button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
        ${totalPages > 1 ? `
          <div class="pagination">
            <button class="btn-sm" id="fuel-prev-page" ${page<=1?'disabled':''}>← Prev</button>
            <span>Page ${page} of ${totalPages}</span>
            <button class="btn-sm" id="fuel-next-page" ${page>=totalPages?'disabled':''}>Next →</button>
          </div>
        ` : ''}
      `}
    </div>
  `;
}

function bindFuelFormEvents(settings) {
  const form = document.getElementById('fuel-form');
  if (!form) return;

  // Live total cost computation
  ['fuel-gallons','fuel-ppg'].forEach(id => {
    document.getElementById(id)?.addEventListener('input', () => {
      const g = parseFloat(document.getElementById('fuel-gallons')?.value);
      const p = parseFloat(document.getElementById('fuel-ppg')?.value);
      if (!isNaN(g) && !isNaN(p)) {
        const totalEl = document.getElementById('fuel-total');
        if (totalEl) totalEl.value = (g * p).toFixed(2);
      }
    });
  });

  document.getElementById('cancel-fuel-edit')?.addEventListener('click', () => {
    editingId = null;
    renderFuelView();
  });

  document.getElementById('clear-fuel-form')?.addEventListener('click', () => {
    editingId = null;
    renderFuelView();
  });

  form.addEventListener('submit', e => {
    e.preventDefault();
    handleFuelSubmit();
  });
}

function handleFuelSubmit() {
  const partial = {
    id: editingId || undefined,
    date: document.getElementById('fuel-date').value,
    odometer: parseFloat(document.getElementById('fuel-odometer')?.value) || null,
    gallons: parseFloat(document.getElementById('fuel-gallons')?.value),
    pricePerGallon: parseFloat(document.getElementById('fuel-ppg')?.value),
    totalCost: parseFloat(document.getElementById('fuel-total')?.value) || null,
    station: document.getElementById('fuel-station')?.value.trim() || '',
    isFullTank: document.getElementById('full-tank')?.checked !== false,
    notes: document.getElementById('fuel-notes')?.value.trim() || '',
  };

  // Auto-compute total if missing
  if (!partial.totalCost && partial.gallons && partial.pricePerGallon) {
    partial.totalCost = +(partial.gallons * partial.pricePerGallon).toFixed(2);
  }

  const record = createFuel(partial);
  const { valid, errors } = validateFuel(record);

  const errDiv = document.getElementById('fuel-errors');
  if (!valid) {
    errDiv.innerHTML = errors.map(e => `<p>${e}</p>`).join('');
    errDiv.classList.remove('hidden');
    return;
  }
  errDiv.classList.add('hidden');

  store.save('fuel', record);
  editingId = null;
  showToast(partial.id ? 'Fill-up updated.' : 'Fill-up saved!', 'success');
  renderFuelView();
}

function bindFuelHistoryEvents() {
  document.querySelectorAll('.edit-fuel-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      editingId = btn.dataset.id;
      renderFuelView();
      document.getElementById('fuel-form-panel')?.scrollIntoView({ behavior: 'smooth' });
    });
  });

  document.querySelectorAll('.delete-fuel-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (await showConfirm('Delete this fuel entry?')) {
        store.delete('fuel', btn.dataset.id);
        showToast('Entry deleted.', 'info');
        refreshFuelHistory();
      }
    });
  });

  document.getElementById('fuel-prev-page')?.addEventListener('click', () => { currentPage--; refreshFuelHistory(); });
  document.getElementById('fuel-next-page')?.addEventListener('click', () => { currentPage++; refreshFuelHistory(); });
}

function refreshFuelHistory() {
  const settings = store.getSettings();
  const histPanel = document.querySelector('#view-fuel .split-history');
  if (histPanel) {
    histPanel.innerHTML = renderFuelHistory(settings);
    bindFuelHistoryEvents();
  }
}
