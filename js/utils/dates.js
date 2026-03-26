// dates.js — Date formatting and range helpers

export function today() {
  return new Date().toISOString().split('T')[0];
}

export function formatDisplay(isoDate, format = 'MM/DD/YYYY') {
  if (!isoDate) return '';
  const [y, m, d] = isoDate.split('-');
  if (format === 'YYYY-MM-DD') return `${y}-${m}-${d}`;
  return `${m}/${d}/${y}`;
}

export function monthName(monthNum) {
  return ['January','February','March','April','May','June',
          'July','August','September','October','November','December'][monthNum - 1] || '';
}

export function shortMonthName(monthNum) {
  return ['Jan','Feb','Mar','Apr','May','Jun',
          'Jul','Aug','Sep','Oct','Nov','Dec'][monthNum - 1] || '';
}

export function getMonthRange(year, month) {
  const start = `${year}-${String(month).padStart(2,'0')}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const end = `${year}-${String(month).padStart(2,'0')}-${String(lastDay).padStart(2,'0')}`;
  return { start, end };
}

export function getYearRange(year) {
  return { start: `${year}-01-01`, end: `${year}-12-31` };
}

export function filterByDateRange(records, start, end) {
  return records.filter(r => r.date >= start && r.date <= end);
}

export function groupByMonth(records) {
  const groups = {};
  for (const r of records) {
    const key = r.date.substring(0, 7); // YYYY-MM
    if (!groups[key]) groups[key] = [];
    groups[key].push(r);
  }
  return groups;
}

export function groupByYear(records) {
  const groups = {};
  for (const r of records) {
    const key = r.date.substring(0, 4);
    if (!groups[key]) groups[key] = [];
    groups[key].push(r);
  }
  return groups;
}

export function getCurrentYear() {
  return new Date().getFullYear();
}

export function getCurrentMonth() {
  return new Date().getMonth() + 1;
}

export function availableYears(trips, fuel) {
  const years = new Set();
  const currentYear = getCurrentYear();
  years.add(currentYear);
  for (const r of [...trips, ...fuel]) {
    if (r.date) years.add(parseInt(r.date.substring(0, 4)));
  }
  return Array.from(years).sort((a, b) => b - a);
}
