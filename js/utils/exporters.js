// exporters.js — CSV, Excel-compatible, and QuickBooks IIF export

import { getTripMiles, computeIRSDeduction } from './calculations.js';
import { formatDisplay } from './dates.js';

function triggerDownload(filename, content, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function escapeCSV(val) {
  if (val == null) return '';
  const s = String(val);
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

function row(fields) {
  return fields.map(escapeCSV).join(',');
}

function tsvRow(fields) {
  return fields.map(f => (f == null ? '' : String(f).replace(/\t/g, ' '))).join('\t');
}

export function exportCSV(trips, fuel, projects, settings, startDate, endDate, label = '') {
  const fmt = d => formatDisplay(d, settings.dateFormat);
  const projectMap = Object.fromEntries(projects.map(p => [p.id, p.name]));

  // Filter by date range if provided
  const filteredTrips = trips.filter(t =>
    (!startDate || t.date >= startDate) && (!endDate || t.date <= endDate)
  );
  const filteredFuel = fuel.filter(f =>
    (!startDate || f.date >= startDate) && (!endDate || f.date <= endDate)
  );

  const lines = [];
  lines.push(`MilesLog Export${label ? ' — ' + label : ''}`);
  lines.push(`Exported: ${new Date().toLocaleDateString()}`);
  lines.push(`IRS Rate: $${settings.irsRatePerMile}/mile (2026)`);
  if (settings.vehicleName) lines.push(`Vehicle: ${settings.vehicleName}`);
  lines.push('');

  // Trips section
  lines.push('MILEAGE LOG');
  lines.push(row(['Date','Miles','Purpose','Project','Description','Entry Mode','Start Odo','End Odo','IRS Deduction']));
  for (const t of filteredTrips.sort((a,b) => a.date.localeCompare(b.date))) {
    const miles = getTripMiles(t);
    const deduction = t.purpose === 'business'
      ? computeIRSDeduction(miles, settings.irsRatePerMile)
      : '';
    lines.push(row([
      fmt(t.date),
      miles,
      t.purpose,
      t.purpose === 'business' ? (projectMap[t.projectId] || '') : '',
      t.description,
      t.entryMode,
      t.startOdometer || '',
      t.endOdometer || '',
      deduction,
    ]));
  }

  // Totals
  const bizMiles = filteredTrips.filter(t => t.purpose === 'business').reduce((s,t) => s + getTripMiles(t), 0);
  const totalMiles = filteredTrips.reduce((s,t) => s + getTripMiles(t), 0);
  lines.push(row(['TOTAL','','','','','','','',
    computeIRSDeduction(bizMiles, settings.irsRatePerMile)]));
  lines.push(row(['Business Miles: ' + bizMiles.toFixed(1), 'Total Miles: ' + totalMiles.toFixed(1)]));
  lines.push('');

  // Fuel section
  lines.push('FUEL LOG');
  lines.push(row(['Date','Odometer','Gallons','Price/Gal','Total Cost','Station','Full Tank','MPG','Notes']));

  // Compute MPG between full fills
  const sortedFuel = [...filteredFuel].sort((a,b) => a.date.localeCompare(b.date));
  const mpgMap = {};
  let prevFull = null;
  for (const f of sortedFuel) {
    if (prevFull && f.isFullTank && f.odometer && prevFull.odometer) {
      const m = f.odometer - prevFull.odometer;
      if (m > 0 && f.gallons > 0) mpgMap[f.id] = (m / f.gallons).toFixed(1);
    }
    if (f.isFullTank) prevFull = f;
  }

  for (const f of sortedFuel) {
    lines.push(row([
      fmt(f.date),
      f.odometer || '',
      f.gallons || '',
      f.pricePerGallon || '',
      f.totalCost || '',
      f.station || '',
      f.isFullTank ? 'Yes' : 'No',
      mpgMap[f.id] || '',
      f.notes || '',
    ]));
  }
  const totalFuelCost = filteredFuel.reduce((s,f) => s + (f.totalCost || 0), 0);
  lines.push(row(['','','','TOTAL', totalFuelCost.toFixed(2)]));

  const filename = `MilesLog${label ? '_' + label.replace(/\s/g,'_') : ''}.csv`;
  triggerDownload(filename, lines.join('\n'), 'text/csv;charset=utf-8;');
}

export function exportExcel(trips, fuel, projects, settings, startDate, endDate, label = '') {
  const fmt = d => formatDisplay(d, settings.dateFormat);
  const projectMap = Object.fromEntries(projects.map(p => [p.id, p.name]));

  const filteredTrips = trips.filter(t =>
    (!startDate || t.date >= startDate) && (!endDate || t.date <= endDate)
  ).sort((a,b) => a.date.localeCompare(b.date));
  const filteredFuel = fuel.filter(f =>
    (!startDate || f.date >= startDate) && (!endDate || f.date <= endDate)
  ).sort((a,b) => a.date.localeCompare(b.date));

  const lines = [];
  lines.push(tsvRow(['MilesLog Mileage & Expense Report', label || '']));
  lines.push(tsvRow(['IRS Rate:', `$${settings.irsRatePerMile}/mile`]));
  if (settings.vehicleName) lines.push(tsvRow(['Vehicle:', settings.vehicleName]));
  lines.push('');

  lines.push(tsvRow(['MILEAGE LOG']));
  lines.push(tsvRow(['Date','Miles','Purpose','Project','Description','Start Odo','End Odo','IRS Deduction']));
  for (const t of filteredTrips) {
    const miles = getTripMiles(t);
    const deduction = t.purpose === 'business'
      ? computeIRSDeduction(miles, settings.irsRatePerMile)
      : '';
    lines.push(tsvRow([
      fmt(t.date), miles, t.purpose,
      t.purpose === 'business' ? (projectMap[t.projectId] || '') : '',
      t.description, t.startOdometer || '', t.endOdometer || '', deduction,
    ]));
  }
  lines.push('');

  lines.push(tsvRow(['FUEL LOG']));
  lines.push(tsvRow(['Date','Odometer','Gallons','Price/Gal','Total Cost','Station','Full Tank','Notes']));
  for (const f of filteredFuel) {
    lines.push(tsvRow([
      fmt(f.date), f.odometer || '', f.gallons || '', f.pricePerGallon || '',
      f.totalCost || '', f.station || '', f.isFullTank ? 'Yes' : 'No', f.notes || '',
    ]));
  }

  const filename = `MilesLog${label ? '_' + label.replace(/\s/g,'_') : ''}.xls`;
  triggerDownload(filename, lines.join('\n'), 'application/vnd.ms-excel');
}

export function exportQuickBooksIIF(trips, projects, settings, startDate, endDate, label = '') {
  const projectMap = Object.fromEntries(projects.map(p => [p.id, p.name]));
  const filteredTrips = trips.filter(t =>
    t.purpose === 'business' &&
    (!startDate || t.date >= startDate) &&
    (!endDate || t.date <= endDate)
  ).sort((a,b) => a.date.localeCompare(b.date));

  const lines = [];
  // IIF Header
  lines.push('!TRNS\tTRNSTYPE\tDATE\tACCNT\tNAME\tCLASS\tAMOUNT\tMEMO');
  lines.push('!SPL\tTRNSTYPE\tDATE\tACCNT\tNAME\tCLASS\tAMOUNT\tMEMO');
  lines.push('!ENDTRNS');

  for (const t of filteredTrips) {
    const miles = getTripMiles(t);
    const amount = computeIRSDeduction(miles, settings.irsRatePerMile);
    const dateStr = formatIIFDate(t.date);
    const project = projectMap[t.projectId] || '';
    const memo = `${miles} miles @ $${settings.irsRatePerMile}/mi${t.description ? ' — ' + t.description : ''}`;

    lines.push([
      'TRNS', 'EXPENSE', dateStr, 'Mileage Expense', settings.vehicleName || 'Vehicle',
      project, amount.toFixed(2), memo
    ].join('\t'));
    lines.push([
      'SPL', 'EXPENSE', dateStr, 'Auto & Travel', settings.vehicleName || 'Vehicle',
      project, (-amount).toFixed(2), memo
    ].join('\t'));
    lines.push('ENDTRNS');
  }

  const filename = `MilesLog_QuickBooks${label ? '_' + label.replace(/\s/g,'_') : ''}.iif`;
  triggerDownload(filename, lines.join('\n'), 'text/plain');
}

function formatIIFDate(isoDate) {
  // QuickBooks IIF uses MM/DD/YY
  const [y, m, d] = isoDate.split('-');
  return `${m}/${d}/${y.slice(2)}`;
}

export function exportBackup(rawJson) {
  triggerDownload('MilesLog_backup_' + new Date().toISOString().split('T')[0] + '.json',
    rawJson, 'application/json');
}
