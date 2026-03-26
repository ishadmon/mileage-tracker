// projects.js — Business project management

import { store } from '../store.js';
import { createProject, validateProject } from '../models.js';
import { computeProjectSummary } from '../utils/calculations.js';
import { showToast, showConfirm } from '../app.js';

const PRESET_COLORS = [
  '#4A90D9','#27AE60','#E74C3C','#F39C12','#8E44AD',
  '#16A085','#2980B9','#D35400','#C0392B','#7F8C8D',
];

export function renderProjectsView() {
  const el = document.getElementById('view-projects');
  const projects = store.getAll('projects');
  const trips = store.getAll('trips');
  const active = projects.filter(p => p.isActive);
  const archived = projects.filter(p => !p.isActive);

  el.innerHTML = `
    <div class="view-header">
      <h1 class="view-title">Business Projects</h1>
      <button class="btn btn-primary" id="add-project-btn">+ Add Project</button>
    </div>

    ${active.length === 0 ? `
      <div class="empty-state center">
        <div class="empty-icon">📁</div>
        <p>No projects yet. Add your first business project to start tagging trips.</p>
        <button class="btn btn-primary" id="add-project-btn-2">+ Add Project</button>
      </div>
    ` : `
      <div class="projects-grid">
        ${active.map(p => renderProjectCard(p, trips)).join('')}
      </div>
    `}

    ${archived.length > 0 ? `
      <details class="archived-section">
        <summary>Archived Projects (${archived.length})</summary>
        <div class="projects-grid mt-2">
          ${archived.map(p => renderProjectCard(p, trips, true)).join('')}
        </div>
      </details>
    ` : ''}

    <!-- Project Modal -->
    <div class="modal-backdrop hidden" id="project-modal-backdrop">
      <div class="modal" id="project-modal">
        <div class="modal-header">
          <h2 id="modal-title">Add Project</h2>
          <button class="modal-close" id="close-modal-btn">✕</button>
        </div>
        <div class="modal-body" id="modal-body">
          ${renderProjectForm(null)}
        </div>
      </div>
    </div>
  `;

  bindProjectsEvents(trips);
}

function renderProjectCard(project, trips, isArchived = false) {
  const stats = computeProjectSummary(trips, project.id);
  return `
    <div class="project-card ${isArchived ? 'archived' : ''}" data-id="${project.id}">
      <div class="project-card-header">
        <div class="project-color-bar" style="background:${project.color}"></div>
        <div class="project-card-title">
          <h3>${escapeHtml(project.name)}</h3>
          ${project.clientName ? `<div class="project-client">${escapeHtml(project.clientName)}</div>` : ''}
        </div>
      </div>
      ${project.description ? `<p class="project-desc">${escapeHtml(project.description)}</p>` : ''}
      <div class="project-stats">
        <div class="pstat"><strong>${stats.tripCount}</strong><span>Trips</span></div>
        <div class="pstat"><strong>${stats.businessMiles.toFixed(1)}</strong><span>Miles</span></div>
      </div>
      <div class="project-actions">
        <button class="btn-sm btn-outline edit-project-btn" data-id="${project.id}">Edit</button>
        ${isArchived
          ? `<button class="btn-sm btn-ghost restore-project-btn" data-id="${project.id}">Restore</button>`
          : `<button class="btn-sm btn-ghost archive-project-btn" data-id="${project.id}">Archive</button>`}
        <button class="btn-sm btn-danger delete-project-btn" data-id="${project.id}">Delete</button>
      </div>
    </div>
  `;
}

function renderProjectForm(project) {
  const p = project || {};
  const selectedColor = p.color || PRESET_COLORS[0];
  return `
    <form id="project-form" novalidate>
      <div class="form-group">
        <label for="proj-name">Project Name <span class="required">*</span></label>
        <input type="text" id="proj-name" name="name" maxlength="60"
          value="${escapeHtml(p.name || '')}" placeholder="e.g. Client Consulting" required>
      </div>
      <div class="form-group">
        <label for="proj-client">Client / Employer Name</label>
        <input type="text" id="proj-client" name="clientName"
          value="${escapeHtml(p.clientName || '')}" placeholder="Optional">
      </div>
      <div class="form-group">
        <label for="proj-desc">Description</label>
        <textarea id="proj-desc" name="description" rows="3" maxlength="500"
          placeholder="Describe this project or business purpose...">${escapeHtml(p.description || '')}</textarea>
      </div>
      <div class="form-group">
        <label>Color</label>
        <div class="color-swatches">
          ${PRESET_COLORS.map(c => `
            <button type="button" class="color-swatch ${c === selectedColor ? 'selected' : ''}"
              style="background:${c}" data-color="${c}" title="${c}"></button>
          `).join('')}
        </div>
        <input type="hidden" id="proj-color" value="${selectedColor}">
      </div>
      <div class="form-errors hidden" id="project-errors"></div>
      <div class="form-actions">
        <button type="submit" class="btn btn-primary" id="save-project-btn">Save Project</button>
        <button type="button" class="btn btn-outline" id="cancel-project-btn">Cancel</button>
      </div>
    </form>
  `;
}

export function openProjectModal(project = null, onSaved = null) {
  const backdrop = document.getElementById('project-modal-backdrop');
  const modalTitle = document.getElementById('modal-title');
  const modalBody = document.getElementById('modal-body');
  if (!backdrop || !modalTitle || !modalBody) {
    // Modal not rendered yet — navigate to projects first
    return;
  }
  modalTitle.textContent = project ? 'Edit Project' : 'Add Project';
  modalBody.innerHTML = renderProjectForm(project);
  backdrop.classList.remove('hidden');
  bindProjectFormEvents(project, onSaved);
  document.getElementById('proj-name')?.focus();
}

function closeModal() {
  const backdrop = document.getElementById('project-modal-backdrop');
  if (backdrop) backdrop.classList.add('hidden');
}

function bindProjectFormEvents(editProject, onSaved) {
  document.getElementById('cancel-project-btn')?.addEventListener('click', closeModal);

  // Color swatches
  document.querySelectorAll('.color-swatch').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.color-swatch').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      document.getElementById('proj-color').value = btn.dataset.color;
    });
  });

  document.getElementById('project-form')?.addEventListener('submit', e => {
    e.preventDefault();
    handleProjectSave(editProject, onSaved);
  });
}

function handleProjectSave(editProject, onSaved) {
  const partial = {
    id: editProject?.id,
    name: document.getElementById('proj-name').value.trim(),
    clientName: document.getElementById('proj-client').value.trim(),
    description: document.getElementById('proj-desc').value.trim(),
    color: document.getElementById('proj-color').value,
    isActive: editProject ? editProject.isActive : true,
  };

  const record = createProject(partial);
  const { valid, errors } = validateProject(record);

  const errDiv = document.getElementById('project-errors');
  if (!valid) {
    errDiv.innerHTML = errors.map(e => `<p>${e}</p>`).join('');
    errDiv.classList.remove('hidden');
    return;
  }

  store.save('projects', record);
  closeModal();
  showToast(partial.id ? 'Project updated.' : 'Project added!', 'success');
  if (onSaved) onSaved();
  else renderProjectsView();
}

function bindProjectsEvents(trips) {
  document.getElementById('add-project-btn')?.addEventListener('click', () => openProjectModal(null));
  document.getElementById('add-project-btn-2')?.addEventListener('click', () => openProjectModal(null));

  document.getElementById('close-modal-btn')?.addEventListener('click', closeModal);
  document.getElementById('project-modal-backdrop')?.addEventListener('click', e => {
    if (e.target.id === 'project-modal-backdrop') closeModal();
  });

  document.querySelectorAll('.edit-project-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const p = store.getById('projects', btn.dataset.id);
      if (p) openProjectModal(p);
    });
  });

  document.querySelectorAll('.archive-project-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (await showConfirm('Archive this project? It will be hidden from dropdowns but trip history is preserved.')) {
        const p = store.getById('projects', btn.dataset.id);
        if (p) {
          store.save('projects', { ...p, isActive: false });
          showToast('Project archived.', 'info');
          renderProjectsView();
        }
      }
    });
  });

  document.querySelectorAll('.restore-project-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const p = store.getById('projects', btn.dataset.id);
      if (p) {
        store.save('projects', { ...p, isActive: true });
        showToast('Project restored.', 'success');
        renderProjectsView();
      }
    });
  });

  document.querySelectorAll('.delete-project-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (await showConfirm('Permanently delete this project? This cannot be undone. Trip history will show no project.')) {
        store.delete('projects', btn.dataset.id);
        // Unlink trips from this project
        const trips = store.getAll('trips');
        trips.filter(t => t.projectId === btn.dataset.id).forEach(t => {
          store.save('trips', { ...t, projectId: null });
        });
        showToast('Project deleted.', 'info');
        renderProjectsView();
      }
    });
  });
}

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;');
}
