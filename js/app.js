// app.js — Boot, routing, global utilities

import { store } from './store.js';
import { renderDashboard } from './views/dashboard.js';
import { renderTripsView } from './views/trips.js';
import { renderFuelView } from './views/fuel.js';
import { renderProjectsView } from './views/projects.js';
import { renderReportsView } from './views/reports.js';
import { renderSettingsView } from './views/settings.js';

const VIEWS = {
  dashboard: { render: renderDashboard, label: 'Dashboard', icon: '🏠' },
  trips:     { render: renderTripsView,    label: 'Trips',     icon: '🚗' },
  fuel:      { render: renderFuelView,     label: 'Fuel',      icon: '⛽' },
  projects:  { render: renderProjectsView, label: 'Projects',  icon: '📁' },
  reports:   { render: renderReportsView,  label: 'Reports',   icon: '📊' },
  settings:  { render: renderSettingsView, label: 'Settings',  icon: '⚙️' },
};

let currentView = 'dashboard';

export function navigateTo(viewName, options = {}) {
  if (!VIEWS[viewName]) return;
  currentView = viewName;

  // Hide all view panels
  document.querySelectorAll('.view-panel').forEach(el => el.classList.add('hidden'));
  // Show target
  const panel = document.getElementById('view-' + viewName);
  if (panel) panel.classList.remove('hidden');

  // Update nav active state
  document.querySelectorAll('.nav-item').forEach(el => {
    el.classList.toggle('active', el.dataset.view === viewName);
  });

  // Update mobile header title
  const titleEl = document.getElementById('mobile-title');
  if (titleEl) titleEl.textContent = VIEWS[viewName].label;

  // Render the view
  VIEWS[viewName].render(options);

  // Close mobile menu if open
  document.getElementById('sidebar')?.classList.remove('open');

  // Scroll to top
  document.getElementById('main-content')?.scrollTo(0, 0);
}

export function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  container.appendChild(toast);

  // Animate in
  requestAnimationFrame(() => toast.classList.add('toast-visible'));

  setTimeout(() => {
    toast.classList.remove('toast-visible');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

export function showConfirm(message) {
  return new Promise(resolve => {
    const overlay = document.createElement('div');
    overlay.className = 'modal-backdrop';
    overlay.innerHTML = `
      <div class="modal confirm-modal">
        <div class="modal-body">
          <p>${message}</p>
          <div class="form-actions">
            <button class="btn btn-danger" id="confirm-yes">Confirm</button>
            <button class="btn btn-outline" id="confirm-no">Cancel</button>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
    overlay.querySelector('#confirm-yes').addEventListener('click', () => {
      overlay.remove();
      resolve(true);
    });
    overlay.querySelector('#confirm-no').addEventListener('click', () => {
      overlay.remove();
      resolve(false);
    });
  });
}

function buildNav() {
  const sidebar = document.getElementById('sidebar');
  const bottomNav = document.getElementById('bottom-nav');
  if (!sidebar || !bottomNav) return;

  const navItems = Object.entries(VIEWS).map(([key, v]) => `
    <button class="nav-item" data-view="${key}">
      <span class="nav-icon">${v.icon}</span>
      <span class="nav-label">${v.label}</span>
    </button>
  `).join('');

  sidebar.querySelector('.nav-list').innerHTML = navItems;
  bottomNav.innerHTML = navItems;

  document.querySelectorAll('.nav-item').forEach(btn => {
    btn.addEventListener('click', () => navigateTo(btn.dataset.view));
  });
}

function init() {
  store.init();

  buildNav();

  // Mobile menu toggle
  document.getElementById('menu-toggle')?.addEventListener('click', () => {
    document.getElementById('sidebar')?.classList.toggle('open');
  });

  // Sidebar overlay close
  document.getElementById('sidebar-overlay')?.addEventListener('click', () => {
    document.getElementById('sidebar')?.classList.remove('open');
  });

  // Make navigateTo available globally for inline onclick handlers
  window.navigateTo = navigateTo;

  // Navigate to dashboard
  navigateTo('dashboard');
}

document.addEventListener('DOMContentLoaded', init);
