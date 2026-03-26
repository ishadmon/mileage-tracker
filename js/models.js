// models.js — Data constructors and validators

export function generateId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxx-xxxx-xxxx-xxxx'.replace(/x/g, () =>
    Math.floor(Math.random() * 16).toString(16)
  );
}

function now() {
  return new Date().toISOString();
}

export function createTrip(partial = {}) {
  const ts = now();
  return {
    id: partial.id || generateId(),
    date: partial.date || today(),
    entryMode: partial.entryMode || 'trip', // 'odometer' | 'trip'
    startOdometer: partial.startOdometer != null ? Number(partial.startOdometer) : null,
    endOdometer: partial.endOdometer != null ? Number(partial.endOdometer) : null,
    tripMiles: partial.tripMiles != null ? Number(partial.tripMiles) : null,
    purpose: partial.purpose || 'business', // 'business' | 'personal'
    projectId: partial.projectId || null,
    description: partial.description || '',
    roundTrip: partial.roundTrip || false,
    createdAt: partial.createdAt || ts,
    updatedAt: ts,
  };
}

export function createFuel(partial = {}) {
  const ts = now();
  const gallons = partial.gallons != null ? Number(partial.gallons) : null;
  const pricePerGallon = partial.pricePerGallon != null ? Number(partial.pricePerGallon) : null;
  return {
    id: partial.id || generateId(),
    date: partial.date || today(),
    odometer: partial.odometer != null ? Number(partial.odometer) : null,
    gallons,
    pricePerGallon,
    totalCost: partial.totalCost != null
      ? Number(partial.totalCost)
      : (gallons && pricePerGallon ? +(gallons * pricePerGallon).toFixed(2) : null),
    station: partial.station || '',
    isFullTank: partial.isFullTank !== undefined ? Boolean(partial.isFullTank) : true,
    notes: partial.notes || '',
    createdAt: partial.createdAt || ts,
    updatedAt: ts,
  };
}

export function createProject(partial = {}) {
  const ts = now();
  return {
    id: partial.id || generateId(),
    name: partial.name || '',
    description: partial.description || '',
    clientName: partial.clientName || '',
    isActive: partial.isActive !== undefined ? Boolean(partial.isActive) : true,
    color: partial.color || '#4A90D9',
    createdAt: partial.createdAt || ts,
    updatedAt: ts,
  };
}

export function validateTrip(record) {
  const errors = [];
  if (!record.date) errors.push('Date is required.');
  if (!record.purpose) errors.push('Purpose (business/personal) is required.');
  if (record.entryMode === 'odometer') {
    if (record.startOdometer == null || isNaN(record.startOdometer)) errors.push('Start odometer is required.');
    if (record.endOdometer == null || isNaN(record.endOdometer)) errors.push('End odometer is required.');
    if (record.startOdometer != null && record.endOdometer != null && record.endOdometer <= record.startOdometer)
      errors.push('End odometer must be greater than start odometer.');
  } else {
    if (record.tripMiles == null || isNaN(record.tripMiles) || record.tripMiles <= 0)
      errors.push('Trip miles must be a positive number.');
  }
  if (record.purpose === 'business' && !record.projectId)
    errors.push('A project must be selected for business trips.');
  return { valid: errors.length === 0, errors };
}

export function validateFuel(record) {
  const errors = [];
  if (!record.date) errors.push('Date is required.');
  if (record.gallons == null || isNaN(record.gallons) || record.gallons <= 0)
    errors.push('Gallons must be a positive number.');
  if (record.pricePerGallon == null || isNaN(record.pricePerGallon) || record.pricePerGallon <= 0)
    errors.push('Price per gallon must be a positive number.');
  return { valid: errors.length === 0, errors };
}

export function validateProject(record) {
  const errors = [];
  if (!record.name || record.name.trim().length === 0) errors.push('Project name is required.');
  if (record.name && record.name.length > 60) errors.push('Project name must be 60 characters or less.');
  return { valid: errors.length === 0, errors };
}

export function computeTripMiles(trip) {
  if (trip.entryMode === 'odometer' && trip.startOdometer != null && trip.endOdometer != null) {
    return +(trip.endOdometer - trip.startOdometer).toFixed(1);
  }
  return trip.tripMiles != null ? +Number(trip.tripMiles).toFixed(1) : 0;
}

function today() {
  const d = new Date();
  return d.toISOString().split('T')[0];
}
