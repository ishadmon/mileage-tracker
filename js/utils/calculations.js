// calculations.js — Pure computation functions

import { computeTripMiles } from '../models.js';
import { filterByDateRange } from './dates.js';

export function getTripMiles(trip) {
  return computeTripMiles(trip);
}

export function computeIRSDeduction(businessMiles, ratePerMile) {
  return +(businessMiles * ratePerMile).toFixed(2);
}

export function computeMPG(fuelRecords) {
  // Returns array of {id, mpg} — mpg between consecutive full-tank fill-ups
  const sorted = [...fuelRecords].sort((a, b) => a.date.localeCompare(b.date));
  const result = {};
  let prevFull = null;
  for (const record of sorted) {
    if (prevFull && record.isFullTank && record.odometer && prevFull.odometer) {
      const miles = record.odometer - prevFull.odometer;
      if (miles > 0 && record.gallons > 0) {
        result[record.id] = +(miles / record.gallons).toFixed(1);
      }
    }
    if (record.isFullTank) prevFull = record;
  }
  return result;
}

export function computePeriodSummary(trips, fuel, startDate, endDate) {
  const filteredTrips = filterByDateRange(trips, startDate, endDate);
  const filteredFuel = filterByDateRange(fuel, startDate, endDate);

  let businessMiles = 0;
  let personalMiles = 0;

  for (const t of filteredTrips) {
    const miles = getTripMiles(t);
    if (t.purpose === 'business') businessMiles += miles;
    else personalMiles += miles;
  }

  const fuelCost = filteredFuel.reduce((sum, f) => sum + (f.totalCost || 0), 0);
  const totalGallons = filteredFuel.reduce((sum, f) => sum + (f.gallons || 0), 0);
  const totalMiles = businessMiles + personalMiles;
  const avgMPG = totalMiles > 0 && totalGallons > 0 ? +(totalMiles / totalGallons).toFixed(1) : null;
  const costPerMile = totalMiles > 0 && fuelCost > 0 ? +(fuelCost / totalMiles).toFixed(3) : null;

  return {
    businessMiles: +businessMiles.toFixed(1),
    personalMiles: +personalMiles.toFixed(1),
    totalMiles: +totalMiles.toFixed(1),
    tripCount: filteredTrips.length,
    fuelCost: +fuelCost.toFixed(2),
    totalGallons: +totalGallons.toFixed(3),
    avgMPG,
    costPerMile,
    fuelCount: filteredFuel.length,
  };
}

export function computeMonthlyBreakdown(trips, fuel, year) {
  const rows = [];
  for (let m = 1; m <= 12; m++) {
    const startDate = `${year}-${String(m).padStart(2,'0')}-01`;
    const lastDay = new Date(year, m, 0).getDate();
    const endDate = `${year}-${String(m).padStart(2,'0')}-${String(lastDay).padStart(2,'0')}`;
    const summary = computePeriodSummary(trips, fuel, startDate, endDate);
    rows.push({ month: m, year, ...summary });
  }
  return rows;
}

export function computeProjectSummary(trips, projectId, startDate, endDate) {
  let filtered = trips.filter(t => t.projectId === projectId);
  if (startDate && endDate) filtered = filterByDateRange(filtered, startDate, endDate);
  const miles = filtered.reduce((sum, t) => sum + getTripMiles(t), 0);
  return { tripCount: filtered.length, businessMiles: +miles.toFixed(1) };
}

export function computeYTDBusinessMiles(trips) {
  const year = new Date().getFullYear();
  return trips
    .filter(t => t.purpose === 'business' && t.date && t.date.startsWith(String(year)))
    .reduce((sum, t) => sum + getTripMiles(t), 0);
}
