// reports.js — Monthly and yearly reports + export

import { store } from '../store.js';
import { computePeriodSummary, computeMonthlyBreakdown, computeIRSDeduction } from '../utils/calculations.js';
import { formatDisplay, monthName, availableYears, getCurrentYear, getCurrentMonth, getMonthRange, getYearRange } from '../utils/dates.js';
import { exportCSV, exportExcel, exportQuickBooksIIF, exportBackup } from '../utils/exporters.js';
import { showToast } from '../app.js';

let reportMode = 'year'; // 'year' | 'month'
let selectedYear = getCurrentYear();
let selectedMonth = getCurrentMonth();

export function renderReportsView() {
  const el = document.getElementById('view-reports');
  const trips = store.getAll('trips');
  const fuel = store.getAll('fuel');
  const settings = store.getSettings();
  const years = availableYears(trips, fuel);
  const projects = store.getAll('projects');

  el.innerHTML = `
    <div class="view-header">
      <h1 class="view-title">Reports</h1>
    </div>

    <div class="reports-controls">
      <div class="toggle-group">
        <button type="button" class="toggle-btn ${reportMode==='year'?'active':''}" id="mode-year">Annual</button>
        <button type="button" class="toggle-btn ${reportMode==='month'?'active':''}" id="mode-month">Monthly</button>
      </div>

      <div class="period-selectors">
        <select id="report-year" class="filter-select">
          ${years.map(y => `<option value="${y}" ${y===selectedYear?'selected':''}>${y}</option>`).join('')}
        </select>
        <select id="report-month" class="filter-select ${reportMode==='month'?'':'hidden'}">
          ${Array.from({length:12},(_,i)=>i+1).map(m =>
            `<option value="${m}" ${m===selectedMonth?'selected':''}>${monthName(m)}</option>`
          ).join('')}
        </select>
      </div>
    </div>

    <div id="report-content">
      ${renderReportContent(trips, fuel, settings, projects)}
    </div>

    <div class="export-section">
      <h2>Export Data</h2>
      <p class="text-muted">Download your data for tax filing or accounting software.</p>
      <div class="export-grid">
        <div class="export-card">
          <div class="export-icon">📄</div>
          <div class="export-info">
            <strong>CSV File</strong>
            <p>Trips + fuel in comma-separated format. Opens in Excel, Google Sheets, Numbers.</p>
          </div>
          <div class="export-btns">
            <button class="btn btn-primary" id="export-csv-period">Current Period</button>
            <button class="btn btn-outline" id="export-csv-all">All Time</button>
          </div>
        </div>
        <div class="export-card">
          <div class="export-icon">📊</div>
          <div class="export-info">
            <strong>Excel File</strong>
            <p>Tab-delimited format that opens directly in Microsoft Excel.</p>
          </div>
          <div class="export-btns">
            <button class="btn btn-primary" id="export-excel-period">Current Period</button>
            <button class="btn btn-outline" id="export-excel-all">All Time</button>
          </div>
        </div>
        <div class="export-card">
          <div class="export-icon">📚</div>
          <div class="export-info">
            <strong>QuickBooks IIF</strong>
            <p>Import business mileage expenses directly into QuickBooks Desktop. Business trips only.</p>
          </div>
          <div class="export-btns">
            <button class="btn btn-primary" id="export-qb-period">Current Period</button>
            <button class="btn btn-outline" id="export-qb-all">All Time</button>
          </div>
        </div>
        <div class="export-card">
          <div class="export-icon">💾</div>
          <div class="export-info">
            <strong>Backup / Restore</strong>
            <p>Full data backup in JSON format. Use to transfer data or restore from backup.</p>
          </div>
          <div class="export-btns">
            <button class="btn btn-primary" id="export-backup">Download Backup</button>
            <label class="btn btn-outline">
              Import Backup
              <input type="file" id="import-backup-file" accept=".json" style="display:none">
            </label>
          </div>
        </div>
      </div>
    </div>
  `;

  bindReportEvents(trips, fuel, settings, projects);
}

function renderReportContent(trips, fuel, settings, projects) {
  if (reportMode === 'year') {
    return renderAnnualReport(trips, fuel, settings, projects, selectedYear);
  } else {
    return renderMonthlyReport(trips, fuel, settings, projects, selectedYear, selectedMonth);
  }
}

function renderAnnualReport(trips, fuel, settings, projects, year) {
  const { start, end } = getYearRange(year);
  const yearSummary = computePeriodSummary(trips, fuel, start, end);
  const monthRows = computeMonthlyBreakdown(trips, fuel, year);
  const irsDeduction = computeIRSDeduction(yearSummary.businessMiles, settings.irsRatePerMile);

  const projectStats = projects.filter(p => {
    return trips.some(t => t.projectId === p.id && t.date.startsWith(String(year)));
  }).map(p => {
    const projectTrips = trips.filter(t => t.projectId === p.id && t.date.startsWith(String(year)));
    const miles = projectTrips.reduce((s,t) => {
      const m = t.entryMode === 'odometer'
        ? (t.endOdometer||0) - (t.startOdometer||0)
        : (t.tripMiles||0);
      return s + m;
    }, 0);
    return { ...p, tripCount: projectTrips.length, miles: +miles.toFixed(1) };
  });

  return `
    <div class="report-summary-cards">
      <div class="rstat-card">
        <div class="rstat-label">Business Miles</div>
        <div class="rstat-value text-business">${yearSummary.businessMiles.toFixed(1)}</div>
      </div>
      <div class="rstat-card">
        <div class="rstat-label">Personal Miles</div>
        <div class="rstat-value">${yearSummary.personalMiles.toFixed(1)}</div>
      </div>
      <div class="rstat-card highlight">
        <div class="rstat-label">Est. IRS Deduction</div>
        <div class="rstat-value text-green">$${irsDeduction.toLocaleString('en-US',{minimumFractionDigits:2})}</div>
        <div class="rstat-note">@ $${settings.irsRatePerMile}/mile</div>
      </div>
      <div class="rstat-card">
        <div class="rstat-label">Total Fuel Cost</div>
        <div class="rstat-value">$${yearSummary.fuelCost.toFixed(2)}</div>
      </div>
      ${yearSummary.avgMPG ? `
        <div class="rstat-card">
          <div class="rstat-label">Avg MPG</div>
          <div class="rstat-value">${yearSummary.avgMPG}</div>
        </div>
      ` : ''}
    </div>

    <h3 class="section-heading">Monthly Breakdown — ${year}</h3>
    <div class="table-scroll">
      <table class="data-table report-table">
        <thead>
          <tr>
            <th>Month</th><th>Trips</th><th>Business Mi</th><th>Personal Mi</th>
            <th>Total Mi</th><th>Fuel Cost</th><th>IRS Deduction</th>
          </tr>
        </thead>
        <tbody>
          ${monthRows.map(row => `
            <tr class="${row.tripCount === 0 ? 'row-empty' : ''}">
              <td>${monthName(row.month)}</td>
              <td>${row.tripCount || '—'}</td>
              <td>${row.businessMiles > 0 ? `<strong>${row.businessMiles.toFixed(1)}</strong>` : '—'}</td>
              <td>${row.personalMiles > 0 ? row.personalMiles.toFixed(1) : '—'}</td>
              <td>${row.totalMiles > 0 ? row.totalMiles.toFixed(1) : '—'}</td>
              <td>${row.fuelCost > 0 ? '$' + row.fuelCost.toFixed(2) : '—'}</td>
              <td>${row.businessMiles > 0
                ? `<strong class="text-green">$${computeIRSDeduction(row.businessMiles,settings.irsRatePerMile).toFixed(2)}</strong>`
                : '—'}</td>
            </tr>
          `).join('')}
        </tbody>
        <tfoot>
          <tr class="totals-row">
            <td><strong>TOTAL</strong></td>
            <td><strong>${yearSummary.tripCount}</strong></td>
            <td><strong class="text-business">${yearSummary.businessMiles.toFixed(1)}</strong></td>
            <td><strong>${yearSummary.personalMiles.toFixed(1)}</strong></td>
            <td><strong>${yearSummary.totalMiles.toFixed(1)}</strong></td>
            <td><strong>$${yearSummary.fuelCost.toFixed(2)}</strong></td>
            <td><strong class="text-green">$${irsDeduction.toFixed(2)}</strong></td>
          </tr>
        </tfoot>
      </table>
    </div>

    ${projectStats.length > 0 ? `
      <h3 class="section-heading">By Project — ${year}</h3>
      <div class="table-scroll">
        <table class="data-table">
          <thead><tr><th>Project</th><th>Client</th><th>Trips</th><th>Business Miles</th><th>IRS Deduction</th></tr></thead>
          <tbody>
            ${projectStats.sort((a,b) => b.miles - a.miles).map(p => `
              <tr>
                <td><span class="project-dot" style="background:${p.color}"></span>${p.name}</td>
                <td class="text-muted">${p.clientName || '—'}</td>
                <td>${p.tripCount}</td>
                <td><strong>${p.miles.toFixed(1)}</strong></td>
                <td><strong class="text-green">$${computeIRSDeduction(p.miles,settings.irsRatePerMile).toFixed(2)}</strong></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    ` : ''}
  `;
}

function renderMonthlyReport(trips, fuel, settings, projects, year, month) {
  const { start, end } = getMonthRange(year, month);
  const summary = computePeriodSummary(trips, fuel, start, end);
  const irsDeduction = computeIRSDeduction(summary.businessMiles, settings.irsRatePerMile);
  const projectMap = Object.fromEntries(projects.map(p => [p.id, p]));

  const monthTrips = trips.filter(t => t.date >= start && t.date <= end)
    .sort((a,b) => a.date.localeCompare(b.date));

  return `
    <div class="report-summary-cards">
      <div class="rstat-card">
        <div class="rstat-label">Business Miles</div>
        <div class="rstat-value text-business">${summary.businessMiles.toFixed(1)}</div>
      </div>
      <div class="rstat-card">
        <div class="rstat-label">Personal Miles</div>
        <div class="rstat-value">${summary.personalMiles.toFixed(1)}</div>
      </div>
      <div class="rstat-card highlight">
        <div class="rstat-label">Est. IRS Deduction</div>
        <div class="rstat-value text-green">$${irsDeduction.toFixed(2)}</div>
        <div class="rstat-note">@ $${settings.irsRatePerMile}/mile</div>
      </div>
      <div class="rstat-card">
        <div class="rstat-label">Fuel Cost</div>
        <div class="rstat-value">$${summary.fuelCost.toFixed(2)}</div>
      </div>
    </div>

    <h3 class="section-heading">All Trips — ${monthName(month)} ${year}</h3>
    ${monthTrips.length === 0 ? `<p class="text-muted">No trips this month.</p>` : `
      <div class="table-scroll">
        <table class="data-table">
          <thead>
            <tr><th>Date</th><th>Miles</th><th>Purpose</th><th>Project</th><th>Notes</th><th>IRS Ded.</th></tr>
          </thead>
          <tbody>
            ${monthTrips.map(t => {
              const miles = t.entryMode === 'odometer'
                ? (t.endOdometer||0) - (t.startOdometer||0)
                : (t.tripMiles||0);
              const proj = t.projectId && projectMap[t.projectId];
              const ded = t.purpose === 'business' ? computeIRSDeduction(miles, settings.irsRatePerMile) : null;
              return `<tr>
                <td class="nowrap">${formatDisplay(t.date, settings.dateFormat)}</td>
                <td><strong>${miles.toFixed(1)}</strong></td>
                <td><span class="badge badge-${t.purpose}">${t.purpose}</span></td>
                <td>${proj ? `<span class="project-dot" style="background:${proj.color}"></span>${proj.name}` : '—'}</td>
                <td class="text-muted">${t.description || '—'}</td>
                <td>${ded ? `<strong class="text-green">$${ded.toFixed(2)}</strong>` : '—'}</td>
              </tr>`;
            }).join('')}
          </tbody>
          <tfoot>
            <tr class="totals-row">
              <td><strong>TOTAL</strong></td>
              <td><strong>${summary.totalMiles.toFixed(1)}</strong></td>
              <td></td><td></td><td></td>
              <td><strong class="text-green">$${irsDeduction.toFixed(2)}</strong></td>
            </tr>
          </tfoot>
        </table>
      </div>
    `}
  `;
}

function getPeriodDates() {
  if (reportMode === 'year') {
    return getYearRange(selectedYear);
  }
  return getMonthRange(selectedYear, selectedMonth);
}

function getPeriodLabel() {
  if (reportMode === 'year') return String(selectedYear);
  return `${monthName(selectedMonth)}_${selectedYear}`;
}

function bindReportEvents(trips, fuel, settings, projects) {
  document.getElementById('mode-year')?.addEventListener('click', () => {
    reportMode = 'year';
    rerenderReport(trips, fuel, settings, projects);
  });
  document.getElementById('mode-month')?.addEventListener('click', () => {
    reportMode = 'month';
    rerenderReport(trips, fuel, settings, projects);
  });

  document.getElementById('report-year')?.addEventListener('change', e => {
    selectedYear = parseInt(e.target.value);
    rerenderReport(trips, fuel, settings, projects);
  });

  document.getElementById('report-month')?.addEventListener('change', e => {
    selectedMonth = parseInt(e.target.value);
    rerenderReport(trips, fuel, settings, projects);
  });

  // Export buttons
  document.getElementById('export-csv-period')?.addEventListener('click', () => {
    const { start, end } = getPeriodDates();
    exportCSV(trips, fuel, projects, settings, start, end, getPeriodLabel());
    showToast('CSV downloaded.', 'success');
  });
  document.getElementById('export-csv-all')?.addEventListener('click', () => {
    exportCSV(trips, fuel, projects, settings, null, null, 'AllTime');
    showToast('CSV downloaded.', 'success');
  });
  document.getElementById('export-excel-period')?.addEventListener('click', () => {
    const { start, end } = getPeriodDates();
    exportExcel(trips, fuel, projects, settings, start, end, getPeriodLabel());
    showToast('Excel file downloaded.', 'success');
  });
  document.getElementById('export-excel-all')?.addEventListener('click', () => {
    exportExcel(trips, fuel, projects, settings, null, null, 'AllTime');
    showToast('Excel file downloaded.', 'success');
  });
  document.getElementById('export-qb-period')?.addEventListener('click', () => {
    const { start, end } = getPeriodDates();
    exportQuickBooksIIF(trips, projects, settings, start, end, getPeriodLabel());
    showToast('QuickBooks IIF downloaded.', 'success');
  });
  document.getElementById('export-qb-all')?.addEventListener('click', () => {
    exportQuickBooksIIF(trips, projects, settings, null, null, 'AllTime');
    showToast('QuickBooks IIF downloaded.', 'success');
  });
  document.getElementById('export-backup')?.addEventListener('click', () => {
    exportBackup(store.exportRaw());
    showToast('Backup downloaded.', 'success');
  });

  document.getElementById('import-backup-file')?.addEventListener('change', async e => {
    const file = e.target.files[0];
    if (!file) return;
    const text = await file.text();
    try {
      store.importRaw(text);
      showToast('Backup imported successfully! Reloading...', 'success');
      setTimeout(() => location.reload(), 1500);
    } catch (err) {
      showToast('Import failed: ' + err.message, 'error');
    }
  });
}

function rerenderReport(trips, fuel, settings, projects) {
  document.querySelectorAll('.toggle-btn[id^="mode-"]').forEach(btn => btn.classList.remove('active'));
  document.getElementById(`mode-${reportMode}`)?.classList.add('active');
  document.getElementById('report-month')?.classList.toggle('hidden', reportMode !== 'month');
  document.getElementById('report-content').innerHTML = renderReportContent(trips, fuel, settings, projects);
}
