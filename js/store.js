// store.js — All localStorage read/write with schema migrations

const PREFIX = 'mileslog.';
const SCHEMA_VERSION = '1';

export const store = {
  init() {
    const version = localStorage.getItem(PREFIX + 'schema_version');
    if (!version) {
      // First run — seed defaults
      localStorage.setItem(PREFIX + 'schema_version', SCHEMA_VERSION);
      localStorage.setItem(PREFIX + 'trips', JSON.stringify([]));
      localStorage.setItem(PREFIX + 'fuel', JSON.stringify([]));
      localStorage.setItem(PREFIX + 'projects', JSON.stringify([]));
      localStorage.setItem(PREFIX + 'settings', JSON.stringify(defaultSettings()));
    } else if (version !== SCHEMA_VERSION) {
      this._migrate(version);
    }
    // Ensure settings have all keys (upgrade existing settings)
    const existing = this.getSettings();
    const merged = { ...defaultSettings(), ...existing };
    localStorage.setItem(PREFIX + 'settings', JSON.stringify(merged));
  },

  getAll(entity) {
    try {
      const raw = localStorage.getItem(PREFIX + entity);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  },

  getById(entity, id) {
    return this.getAll(entity).find(r => r.id === id) || null;
  },

  save(entity, record) {
    const all = this.getAll(entity);
    const idx = all.findIndex(r => r.id === record.id);
    if (idx >= 0) {
      all[idx] = { ...all[idx], ...record, updatedAt: new Date().toISOString() };
    } else {
      all.push(record);
    }
    localStorage.setItem(PREFIX + entity, JSON.stringify(all));
    return record;
  },

  delete(entity, id) {
    const all = this.getAll(entity).filter(r => r.id !== id);
    localStorage.setItem(PREFIX + entity, JSON.stringify(all));
  },

  getSettings() {
    try {
      const raw = localStorage.getItem(PREFIX + 'settings');
      return raw ? JSON.parse(raw) : defaultSettings();
    } catch {
      return defaultSettings();
    }
  },

  saveSettings(partial) {
    const current = this.getSettings();
    const updated = { ...current, ...partial };
    localStorage.setItem(PREFIX + 'settings', JSON.stringify(updated));
    return updated;
  },

  exportRaw() {
    const out = {};
    for (const key of ['trips', 'fuel', 'projects', 'settings']) {
      out[key] = this.getAll(key);
    }
    out._settings = this.getSettings();
    out._version = SCHEMA_VERSION;
    return JSON.stringify(out, null, 2);
  },

  importRaw(json) {
    const data = typeof json === 'string' ? JSON.parse(json) : json;
    if (!data.trips || !data.fuel || !data.projects) throw new Error('Invalid backup format.');
    localStorage.setItem(PREFIX + 'trips', JSON.stringify(data.trips));
    localStorage.setItem(PREFIX + 'fuel', JSON.stringify(data.fuel));
    localStorage.setItem(PREFIX + 'projects', JSON.stringify(data.projects));
    if (data._settings) localStorage.setItem(PREFIX + 'settings', JSON.stringify(data._settings));
    localStorage.setItem(PREFIX + 'schema_version', SCHEMA_VERSION);
  },

  _migrate(fromVersion) {
    // Future migrations go here
    console.log('MilesLog: migrating from schema version', fromVersion);
    localStorage.setItem(PREFIX + 'schema_version', SCHEMA_VERSION);
  },
};

function defaultSettings() {
  return {
    irsRatePerMile: 0.70,
    defaultPurpose: 'business',
    vehicleName: '',
    fiscalYearStartMonth: 1,
    dateFormat: 'MM/DD/YYYY',
    distanceUnit: 'miles',
  };
}
