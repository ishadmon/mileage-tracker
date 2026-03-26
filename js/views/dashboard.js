// dashboard.js — Dashboard view

import { store } from '../store.js';
import { computePeriodSummary, computeIRSDeduction, getTripMiles, computeYTDBusinessMiles } from '../utils/calculations.js';
import { formatDisplay, today, getCurrentYear, getCurrentMonth, getMonthRange, getYearRange } from '../utils/dates.js';
import { navigateTo } from '../app.js';

export function renderDashboard() {
  const el = document.getElementById('view-dashboard');
  const trips = store.getAll('trips');
  const fuel = store.getAll('fuel');
  const projects = store.getAll('projects');
  const settings = store.getSettings();

  const year = getCurrentYear();
  const month = getCurrentMonth();
  const monthRange = getMonthRange(year, month);
  const yearRange = getYearRange(year);

  const monthSummary = computePeriodSummary(trips, fuel, monthRange.start, monthRange.end);
  const yearSummary = computePeriodSummary(trips, fuel, yearRange.start, yearRange.end);
  const irsYTD = computeIRSDeduction(yearSummary.businessMiles, settings.irsRatePerMile);
  const irsMonth = computeIRSDeduction(monthSummary.businessMiles, settings.irsRatePerMile);

  const recentTrips = [...trips].sort((a,b) => b.date.localeCompare(a.date)).slice(0,5);
  const recentFuel = [...fuel].sort((a,b) => b.date.localeCompare(a.date)).slice(0,3);
  const projectMap = Object.fromEntries(projects.map(p => [p.id, p]));

  el.innerHTML = `
    <div class="view-header">
      <h1 class="view-title">Dashboard</h1>
      <div class="view-subtitle">${new Date().toLocaleDateString('en-US', {weekday:'long', year:'numeric', month:'long', day:'numeric'})}</div>
    </div>

    <div class="stats-grid">
      <div class="stat-card stat-business">
        <div class="stat-icon">🚗</div>
        <div class="stat-value">${monthSummary.businessMiles.toFixed(1)}</div>
        <div class="stat-label">Business Miles This Month</div>
      </div>
      <div class="stat-card stat-personal">
        <div class="stat-icon">🏠</div>
        <div class="stat-value">${yearSummary.businessMiles.toFixed(1)}</div>
        <div class="stat-label">Business Miles YTD</div>
      </div>
      <div class="stat-card stat-deduction">
        <div class="stat-icon">💰</div>
        <div class="stat-value">$${irsYTD.toLocaleString('en-US', {minimumFractionDigits:2})}</div>
        <div class="stat-label">Est. IRS Deduction YTD</div>
        <div class="stat-note">@ $${settings.irsRatePerMile}/mile (2026)</div>
      </div>
      <div class="stat-card stat-fuel">
        <div class="stat-icon">⛽</div>
        <div class="stat-value">$${yearSummary.fuelCost.toLocaleString('en-US', {minimumFractionDigits:2})}</div>
        <div class="stat-label">Fuel Cost YTD</div>
        ${yearSummary.avgMPG ? `<div class="stat-note">Avg ${yearSummary.avgMPG} MPG</div>` : ''}
      </div>
    </div>

    <div class="dash-row">
      <div class="dash-panel">
        <div class="panel-header">
          <h2>This Month — ${new Date().toLocaleDateString('en-US', {month:'long', year:'numeric'})}</h2>
        </div>
        <div class="month-summary">
          <div class="ms-row"><span>Total Trips</span><strong>${monthSummary.tripCount}</strong></div>
          <div class="ms-row"><span>Total Miles</span><strong>${monthSummary.totalMiles.toFixed(1)}</strong></div>
          <div class="ms-row"><span>Business Miles</span><strong class="text-business">${monthSummary.businessMiles.toFixed(1)}</strong></div>
          <div class="ms-row"><span>Personal Miles</span><strong>${monthSummary.personalMiles.toFixed(1)}</strong></div>
          <div class="ms-row"><span>Est. IRS Deduction</span><strong class="text-green">$${irsMonth.toFixed(2)}</strong></div>
          <div class="ms-row"><span>Fuel Cost</span><strong>$${monthSummary.fuelCost.toFixed(2)}</strong></div>
        </div>
      </div>

      <div class="dash-panel">
        <div class="panel-header">
          <h2>Year to Date — ${year}</h2>
        </div>
        <div class="month-summary">
          <div class="ms-row"><span>Total Trips</span><strong>${yearSummary.tripCount}</strong></div>
          <div class="ms-row"><span>Total Miles</span><strong>${yearSummary.totalMiles.toFixed(1)}</strong></div>
          <div class="ms-row"><span>Business Miles</span><strong class="text-business">${yearSummary.businessMiles.toFixed(1)}</strong></div>
          <div class="ms-row"><span>Personal Miles</span><strong>${yearSummary.personalMiles.toFixed(1)}</strong></div>
          <div class="ms-row"><span>Est. IRS Deduction</span><strong class="text-green">$${irsYTD.toFixed(2)}</strong></div>
          <div class="ms-row"><span>Total Fuel Cost</span><strong>$${yearSummary.fuelCost.toFixed(2)}</strong></div>
        </div>
      </div>
    </div>

    <div class="dash-row">
      <div class="dash-panel flex-2">
        <div class="panel-header">
          <h2>Recent Trips</h2>
          <button class="btn-link" onclick="navigateTo('trips')">View All</button>
        </div>
        ${recentTrips.length === 0 ? `
          <div class="empty-state">
            <p>No trips logged yet.</p>
            <button class="btn btn-primary" onclick="navigateTo('trips')">Log Your First Trip</button>
          </div>
        ` : `
          <table class="data-table">
            <thead><tr><th>Date</th><th>Miles</th><th>Purpose</th><th>Project</th><th>Notes</th></tr></thead>
            <tbody>
              ${recentTrips.map(t => {
                const miles = getTripMiles(t);
                const proj = t.projectId && projectMap[t.projectId];
                return `<tr>
                  <td>${formatDisplay(t.date, settings.dateFormat)}</td>
                  <td><strong>${miles.toFixed(1)}</strong></td>
                  <td><span class="badge badge-${t.purpose}">${t.purpose}</span></td>
                  <td>${proj ? `<span class="project-dot" style="background:${proj.color}"></span>${proj.name}` : '—'}</td>
                  <td class="text-muted">${t.description || '—'}</td>
                </tr>`;
              }).join('')}
            </tbody>
          </table>
        `}
      </div>

      <div class="dash-panel">
        <div class="panel-header">
          <h2>Recent Fuel</h2>
          <button class="btn-link" onclick="navigateTo('fuel')">View All</button>
        </div>
        ${recentFuel.length === 0 ? `
          <div class="empty-state">
            <p>No fuel logged yet.</p>
            <button class="btn btn-primary" onclick="navigateTo('fuel')">Log Fill-Up</button>
          </div>
        ` : `
          <table class="data-table">
            <thead><tr><th>Date</th><th>Gallons</th><th>Cost</th><th>PPG</th></tr></thead>
            <tbody>
              ${recentFuel.map(f => `<tr>
                <td>${formatDisplay(f.date, settings.dateFormat)}</td>
                <td>${f.gallons?.toFixed(3)}</td>
                <td><strong>$${f.totalCost?.toFixed(2)}</strong></td>
                <td>$${f.pricePerGallon?.toFixed(3)}</td>
              </tr>`).join('')}
            </tbody>
          </table>
        `}
      </div>
    </div>

    <div class="quick-actions">
      <button class="btn btn-primary btn-lg" onclick="navigateTo('trips')">+ Log Trip</button>
      <button class="btn btn-secondary btn-lg" onclick="navigateTo('fuel')">⛽ Log Fuel</button>
      <button class="btn btn-outline btn-lg" onclick="navigateTo('reports')">📊 Reports</button>
    </div>
  `;
}
