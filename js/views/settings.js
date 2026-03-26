// settings.js — App settings view

import { store } from '../store.js';
import { showToast } from '../app.js';

export function renderSettingsView() {
  const el = document.getElementById('view-settings');
  const settings = store.getSettings();

  el.innerHTML = `
    <div class="view-header">
      <h1 class="view-title">Settings</h1>
    </div>

    <div class="settings-form-wrap">
      <div class="form-card">
        <h2 class="form-title">General Settings</h2>
        <form id="settings-form">

          <div class="form-group">
            <label for="setting-vehicle">Vehicle Name / Description</label>
            <input type="text" id="setting-vehicle" value="${settings.vehicleName || ''}"
              placeholder="e.g. 2022 Toyota Camry">
            <p class="form-hint">Used in report headers and QuickBooks export.</p>
          </div>

          <div class="form-group">
            <label for="setting-irs-rate">IRS Mileage Rate (per mile)</label>
            <div class="input-prefix-wrap">
              <span class="input-prefix">$</span>
              <input type="number" id="setting-irs-rate" value="${settings.irsRatePerMile}"
                min="0.01" step="0.001" style="padding-left:1.8rem">
            </div>
            <p class="form-hint">2026 standard rate: $0.70/mile. Update here if the IRS announces a change.</p>
          </div>

          <div class="form-group">
            <label for="setting-date-format">Date Display Format</label>
            <select id="setting-date-format">
              <option value="MM/DD/YYYY" ${settings.dateFormat==='MM/DD/YYYY'?'selected':''}>MM/DD/YYYY (US)</option>
              <option value="YYYY-MM-DD" ${settings.dateFormat==='YYYY-MM-DD'?'selected':''}>YYYY-MM-DD (ISO)</option>
            </select>
          </div>

          <div class="form-group">
            <label for="setting-default-purpose">Default Trip Purpose</label>
            <select id="setting-default-purpose">
              <option value="business" ${settings.defaultPurpose==='business'?'selected':''}>Business</option>
              <option value="personal" ${settings.defaultPurpose==='personal'?'selected':''}>Personal</option>
            </select>
          </div>

          <div class="form-actions">
            <button type="submit" class="btn btn-primary">Save Settings</button>
          </div>
        </form>
      </div>

      <div class="form-card">
        <h2 class="form-title">About MilesLog</h2>
        <div class="about-info">
          <p><strong>MilesLog</strong> tracks your business mileage for IRS tax deductions.</p>
          <p>All data is stored locally in your browser using localStorage. No data is sent to any server.</p>
          <p>2026 IRS Business Mileage Rate: <strong>$0.70 per mile</strong></p>
          <p class="text-muted" style="font-size:0.8rem">Note: Always verify the current IRS rate at irs.gov. Update the rate above if needed.</p>
        </div>
      </div>
    </div>
  `;

  document.getElementById('settings-form')?.addEventListener('submit', e => {
    e.preventDefault();
    const updated = store.saveSettings({
      vehicleName: document.getElementById('setting-vehicle').value.trim(),
      irsRatePerMile: parseFloat(document.getElementById('setting-irs-rate').value) || 0.70,
      dateFormat: document.getElementById('setting-date-format').value,
      defaultPurpose: document.getElementById('setting-default-purpose').value,
    });
    showToast('Settings saved.', 'success');
  });
}
