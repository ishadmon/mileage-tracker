// trips.js — Trip logging view

import { store } from '../store.js';
import { createTrip, validateTrip, computeTripMiles } from '../models.js';
import { formatDisplay, today } from '../utils/dates.js';
import { showToast, showConfirm } from '../app.js';

let editingId = null;
let currentFilters = { search: '', purpose: 'all', projectId: 'all', dateFrom: '', dateTo: '' };
let currentPage = 1;
const PAGE_SIZE = 25;

export function renderTripsView(options = {}) {
  if (options.editId) editingId = options.editId;
  const el = document.getElementById('view-trips');
  const projects = store.getAll('projects').filter(p => p.isActive);
  const settings = store.getSettings();

  el.innerHTML = `
    <div class="view-header">
      <h1 class="view-title">Trip Log</h1>
    </div>
    <div class="split-view">
      <div class="split-form" id="trip-form-panel">
        ${renderTripForm(editingId, projects, settings)}
      </div>
      <div class="split-history">
        ${renderTripHistory(projects, settings)}
      </div>
    </div>
  `;

  bindTripFormEvents(projects, settings);
  bindTripHistoryEvents();
}

function renderTripForm(editId, projects, settings) {
  const record = editId ? store.getById('trips', editId) : null;
  const isEdit = !!record;
  const r = record || {};
  const mode = r.entryMode || settings.defaultEntryMode || 'trip';
  const purpose = r.purpose || settings.defaultPurpose || 'business';

  return `
    <div class="form-card">
      <h2 class="form-title">${isEdit ? 'Edit Trip' : 'Log a Trip'}</h2>

      <form id="trip-form" novalidate>
        <div class="form-group">
          <label for="trip-date">Date</label>
          <input type="date" id="trip-date" name="date" value="${r.date || today()}" required>
        </div>

        <div class="form-group">
          <label>Entry Mode</label>
          <div class="toggle-group" id="entry-mode-toggle">
            <button type="button" class="toggle-btn ${mode === 'trip' ? 'active' : ''}" data-mode="trip">Trip Miles</button>
            <button type="button" class="toggle-btn ${mode === 'odometer' ? 'active' : ''}" data-mode="odometer">Odometer</button>
          </div>
        </div>

        <div id="trip-miles-fields" class="${mode === 'trip' ? '' : 'hidden'}">
          <div class="form-group">
            <label for="trip-miles">Trip Miles</label>
            <input type="number" id="trip-miles" name="tripMiles" min="0.1" step="0.1"
              value="${r.tripMiles || ''}" placeholder="e.g. 12.5">
          </div>
          <div class="form-group">
            <label>
              <input type="checkbox" id="round-trip" ${r.roundTrip ? 'checked' : ''}>
              Round trip (double the miles)
            </label>
          </div>
        </div>

        <div id="odometer-fields" class="${mode === 'odometer' ? '' : 'hidden'}">
          <div class="form-row">
            <div class="form-group">
              <label for="start-odo">Start Odometer</label>
              <input type="number" id="start-odo" name="startOdometer" min="0" step="0.1"
                value="${r.startOdometer || ''}" placeholder="e.g. 45230">
            </div>
            <div class="form-group">
              <label for="end-odo">End Odometer</label>
              <input type="number" id="end-odo" name="endOdometer" min="0" step="0.1"
                value="${r.endOdometer || ''}" placeholder="e.g. 45250">
            </div>
          </div>
          <div class="computed-miles hidden" id="computed-miles-display">
            Computed: <strong id="computed-miles-value">0</strong> miles
          </div>
        </div>

        <div class="form-group">
          <label>Purpose</label>
          <div class="toggle-group" id="purpose-toggle">
            <button type="button" class="toggle-btn toggle-business ${purpose === 'business' ? 'active' : ''}" data-purpose="business">Business</button>
            <button type="button" class="toggle-btn toggle-personal ${purpose === 'personal' ? 'active' : ''}" data-purpose="personal">Personal</button>
          </div>
        </div>

        <div class="form-group" id="project-field" ${purpose !== 'business' ? 'style="display:none"' : ''}>
          <label for="trip-project">Business Project <span class="required">*</span></label>
          <div class="project-select-row">
            <select id="trip-project" name="projectId">
              <option value="">— Select project —</option>
              ${projects.map(p =>
                `<option value="${p.id}" ${r.projectId === p.id ? 'selected' : ''}
                  style="border-left: 4px solid ${p.color}">${p.name}${p.clientName ? ' (' + p.clientName + ')' : ''}</option>`
              ).join('')}
            </select>
            <button type="button" class="btn-link" id="new-project-btn">+ New</button>
          </div>
          ${projects.length === 0 ? `<p class="form-hint text-warn">No projects yet. <button type="button" class="btn-link" id="go-projects-btn">Add one first.</button></p>` : ''}
        </div>

        <div class="form-group">
          <label for="trip-description">Notes / Description</label>
          <textarea id="trip-description" name="description" rows="2"
            placeholder="e.g. Client meeting downtown">${r.description || ''}</textarea>
        </div>

        <div class="form-errors hidden" id="trip-errors"></div>

        <div class="form-actions">
          <button type="submit" class="btn btn-primary">${isEdit ? 'Update Trip' : 'Save Trip'}</button>
          ${isEdit ? `<button type="button" class="btn btn-outline" id="cancel-edit-btn">Cancel</button>` : `<button type="button" class="btn btn-ghost" id="clear-form-btn">Clear</button>`}
        </div>
      </form>
    </div>
  `;
}

function renderTripHistory(projects, settings) {
  const allTrips = store.getAll('trips');
  const projectMap = Object.fromEntries(projects.concat(store.getAll('projects').filter(p => !p.isActive)).map(p => [p.id, p]));
  const allProjects = store.getAll('projects');

  // Apply filters
  let filtered = allTrips.filter(t => {
    if (currentFilters.purpose !== 'all' && t.purpose !== currentFilters.purpose) return false;
    if (currentFilters.projectId !== 'all' && t.projectId !== currentFilters.projectId) return false;
    if (currentFilters.dateFrom && t.date < currentFilters.dateFrom) return false;
    if (currentFilters.dateTo && t.date > currentFilters.dateTo) return false;
    if (currentFilters.search) {
      const q = currentFilters.search.toLowerCase();
      const proj = t.projectId && projectMap[t.projectId];
      return (t.description || '').toLowerCase().includes(q) ||
             (proj && proj.name.toLowerCase().includes(q));
    }
    return true;
  }).sort((a,b) => b.date.localeCompare(a.date));

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const page = Math.min(currentPage, totalPages);
  const paged = filtered.slice((page-1)*PAGE_SIZE, page*PAGE_SIZE);

  const bizMiles = filtered.filter(t=>t.purpose==='business').reduce((s,t)=>s+computeTripMiles(t),0);
  const totalMiles = filtered.reduce((s,t)=>s+computeTripMiles(t),0);

  return `
    <div class="history-panel">
      <div class="history-header">
        <h2>Trip History <span class="count-badge">${filtered.length}</span></h2>
      </div>

      <div class="filter-bar">
        <input type="text" id="trip-search" placeholder="Search notes/project..." value="${currentFilters.search}" class="filter-input">
        <select id="filter-purpose" class="filter-select">
          <option value="all">All Purposes</option>
          <option value="business" ${currentFilters.purpose==='business'?'selected':''}>Business</option>
          <option value="personal" ${currentFilters.purpose==='personal'?'selected':''}>Personal</option>
        </select>
        <select id="filter-project" class="filter-select">
          <option value="all">All Projects</option>
          ${allProjects.map(p => `<option value="${p.id}" ${currentFilters.projectId===p.id?'selected':''}>${p.name}</option>`).join('')}
        </select>
        <div class="filter-dates">
          <input type="date" id="filter-date-from" value="${currentFilters.dateFrom}" class="filter-input-sm" title="From date">
          <span>–</span>
          <input type="date" id="filter-date-to" value="${currentFilters.dateTo}" class="filter-input-sm" title="To date">
        </div>
        <button class="btn-ghost btn-sm" id="clear-filters-btn">Clear</button>
      </div>

      ${filtered.length > 0 ? `
        <div class="summary-bar">
          <span>Business: <strong>${bizMiles.toFixed(1)} mi</strong></span>
          <span>Total: <strong>${totalMiles.toFixed(1)} mi</strong></span>
        </div>
      ` : ''}

      ${paged.length === 0 ? `
        <div class="empty-state">
          <p>${allTrips.length === 0 ? 'No trips logged yet. Log your first trip on the left!' : 'No trips match the current filters.'}</p>
        </div>
      ` : `
        <div class="table-scroll">
          <table class="data-table">
            <thead>
              <tr>
                <th>Date</th><th>Miles</th><th>Purpose</th><th>Project</th><th>Notes</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              ${paged.map(t => {
                const miles = computeTripMiles(t);
                const proj = t.projectId && projectMap[t.projectId];
                return `<tr data-id="${t.id}">
                  <td class="nowrap">${formatDisplay(t.date, settings.dateFormat)}</td>
                  <td><strong>${miles.toFixed(1)}</strong></td>
                  <td><span class="badge badge-${t.purpose}">${t.purpose}</span></td>
                  <td>${proj ? `<span class="project-dot" style="background:${proj.color}"></span><span class="proj-name">${proj.name}</span>` : '—'}</td>
                  <td class="text-muted">${t.description || '—'}</td>
                  <td class="actions-cell">
                    <button class="btn-icon edit-trip-btn" data-id="${t.id}" title="Edit">✏️</button>
                    <button class="btn-icon delete-trip-btn" data-id="${t.id}" title="Delete">🗑️</button>
                  </td>
                </tr>`;
              }).join('')}
            </tbody>
          </table>
        </div>
        ${totalPages > 1 ? `
          <div class="pagination">
            <button class="btn-sm" id="prev-page" ${page<=1?'disabled':''}>← Prev</button>
            <span>Page ${page} of ${totalPages}</span>
            <button class="btn-sm" id="next-page" ${page>=totalPages?'disabled':''}>Next →</button>
          </div>
        ` : ''}
      `}
    </div>
  `;
}

function bindTripFormEvents(projects, settings) {
  const form = document.getElementById('trip-form');
  if (!form) return;

  // Entry mode toggle
  document.querySelectorAll('#entry-mode-toggle .toggle-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#entry-mode-toggle .toggle-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const mode = btn.dataset.mode;
      document.getElementById('trip-miles-fields').classList.toggle('hidden', mode !== 'trip');
      document.getElementById('odometer-fields').classList.toggle('hidden', mode !== 'odometer');
    });
  });

  // Purpose toggle
  document.querySelectorAll('#purpose-toggle .toggle-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#purpose-toggle .toggle-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const isBusinesss = btn.dataset.purpose === 'business';
      const pf = document.getElementById('project-field');
      if (pf) pf.style.display = isBusinesss ? '' : 'none';
    });
  });

  // Odometer live compute
  ['start-odo','end-odo'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('input', updateComputedMiles);
  });

  // Round trip
  const rtCheck = document.getElementById('round-trip');
  const tripMilesInput = document.getElementById('trip-miles');
  if (rtCheck && tripMilesInput) {
    rtCheck.addEventListener('change', () => {});
  }

  // New project shortcut
  const npBtn = document.getElementById('new-project-btn');
  if (npBtn) npBtn.addEventListener('click', () => {
    import('./projects.js').then(m => m.openProjectModal(null, () => renderTripsView()));
  });

  const gpBtn = document.getElementById('go-projects-btn');
  if (gpBtn) gpBtn.addEventListener('click', () => {
    import('../app.js').then(m => m.navigateTo('projects'));
  });

  // Cancel edit
  const cancelBtn = document.getElementById('cancel-edit-btn');
  if (cancelBtn) cancelBtn.addEventListener('click', () => {
    editingId = null;
    renderTripsView();
  });

  // Clear form
  const clearBtn = document.getElementById('clear-form-btn');
  if (clearBtn) clearBtn.addEventListener('click', () => {
    editingId = null;
    renderTripsView();
  });

  // Submit
  form.addEventListener('submit', e => {
    e.preventDefault();
    handleTripSubmit(projects, settings);
  });
}

function updateComputedMiles() {
  const start = parseFloat(document.getElementById('start-odo')?.value);
  const end = parseFloat(document.getElementById('end-odo')?.value);
  const display = document.getElementById('computed-miles-display');
  const value = document.getElementById('computed-miles-value');
  if (display && value) {
    if (!isNaN(start) && !isNaN(end) && end > start) {
      value.textContent = (end - start).toFixed(1);
      display.classList.remove('hidden');
    } else {
      display.classList.add('hidden');
    }
  }
}

function getActiveMode() {
  const activeBtn = document.querySelector('#entry-mode-toggle .toggle-btn.active');
  return activeBtn ? activeBtn.dataset.mode : 'trip';
}

function getActivePurpose() {
  const activeBtn = document.querySelector('#purpose-toggle .toggle-btn.active');
  return activeBtn ? activeBtn.dataset.purpose : 'business';
}

function handleTripSubmit(projects, settings) {
  const mode = getActiveMode();
  const purpose = getActivePurpose();

  let tripMiles = null;
  const rawMiles = parseFloat(document.getElementById('trip-miles')?.value);
  const roundTrip = document.getElementById('round-trip')?.checked;
  if (mode === 'trip' && !isNaN(rawMiles)) {
    tripMiles = roundTrip ? rawMiles * 2 : rawMiles;
  }

  const partial = {
    id: editingId || undefined,
    date: document.getElementById('trip-date').value,
    entryMode: mode,
    startOdometer: mode === 'odometer' ? parseFloat(document.getElementById('start-odo').value) : null,
    endOdometer: mode === 'odometer' ? parseFloat(document.getElementById('end-odo').value) : null,
    tripMiles: mode === 'trip' ? tripMiles : null,
    purpose,
    projectId: purpose === 'business' ? document.getElementById('trip-project').value || null : null,
    description: document.getElementById('trip-description').value.trim(),
    roundTrip: roundTrip || false,
  };

  const record = createTrip(partial);
  const { valid, errors } = validateTrip(record);

  const errDiv = document.getElementById('trip-errors');
  if (!valid) {
    errDiv.innerHTML = errors.map(e => `<p>${e}</p>`).join('');
    errDiv.classList.remove('hidden');
    return;
  }
  errDiv.classList.add('hidden');

  store.save('trips', record);
  editingId = null;
  showToast(partial.id ? 'Trip updated.' : 'Trip saved!', 'success');
  renderTripsView();
}

function bindTripHistoryEvents() {
  // Filters
  const search = document.getElementById('trip-search');
  if (search) search.addEventListener('input', e => { currentFilters.search = e.target.value; currentPage = 1; refreshHistory(); });

  const fp = document.getElementById('filter-purpose');
  if (fp) fp.addEventListener('change', e => { currentFilters.purpose = e.target.value; currentPage = 1; refreshHistory(); });

  const fpr = document.getElementById('filter-project');
  if (fpr) fpr.addEventListener('change', e => { currentFilters.projectId = e.target.value; currentPage = 1; refreshHistory(); });

  const fdf = document.getElementById('filter-date-from');
  if (fdf) fdf.addEventListener('change', e => { currentFilters.dateFrom = e.target.value; currentPage = 1; refreshHistory(); });

  const fdt = document.getElementById('filter-date-to');
  if (fdt) fdt.addEventListener('change', e => { currentFilters.dateTo = e.target.value; currentPage = 1; refreshHistory(); });

  const clearF = document.getElementById('clear-filters-btn');
  if (clearF) clearF.addEventListener('click', () => {
    currentFilters = { search: '', purpose: 'all', projectId: 'all', dateFrom: '', dateTo: '' };
    currentPage = 1;
    refreshHistory();
  });

  // Edit/delete
  document.querySelectorAll('.edit-trip-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      editingId = btn.dataset.id;
      renderTripsView();
      document.getElementById('trip-form-panel')?.scrollIntoView({ behavior: 'smooth' });
    });
  });

  document.querySelectorAll('.delete-trip-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (await showConfirm('Delete this trip?')) {
        store.delete('trips', btn.dataset.id);
        showToast('Trip deleted.', 'info');
        refreshHistory();
      }
    });
  });

  // Pagination
  document.getElementById('prev-page')?.addEventListener('click', () => { currentPage--; refreshHistory(); });
  document.getElementById('next-page')?.addEventListener('click', () => { currentPage++; refreshHistory(); });
}

function refreshHistory() {
  const projects = store.getAll('projects');
  const settings = store.getSettings();
  const histPanel = document.querySelector('.split-history');
  if (histPanel) {
    histPanel.innerHTML = renderTripHistory(projects, settings);
    bindTripHistoryEvents();
  }
}
