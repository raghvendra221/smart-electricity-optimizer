// utils/electricity.js

export const RATE_PER_KWH = 9; // ₹ per kWh

export function calcDailyKwh(wattage, hours) {
  return parseFloat(((wattage * hours) / 1000).toFixed(3));
}

export function calcMonthlyKwh(wattage, hours) {
  return parseFloat((calcDailyKwh(wattage, hours) * 30).toFixed(1));
}

export function calcMonthlyCost(wattage, hours, rate = RATE_PER_KWH) {
  return Math.round(calcMonthlyKwh(wattage, hours) * rate);
}

export function calcTotalDailyKwh(appliances) {
  return parseFloat(
    appliances.reduce((s, a) => s + calcDailyKwh(a.wattage, a.hours), 0).toFixed(2)
  );
}

export function calculateBill(units) {
  if (units <= 100) return units * 9;
  if (units <= 200) return (100 * 9) + ((units - 100) * 12);
  return (100 * 9) + (100 * 12) + ((units - 200) * 15);
}

export function formatCurrency(amount) {
  return `₹${amount.toLocaleString('en-IN')}`;
}

export function formatKwh(kwh) {
  return `${kwh} kWh`;
}

export function getTopConsumer(appliances) {
  if (!appliances.length) return null;
  return [...appliances].sort(
    (a, b) => b.wattage * b.hours - a.wattage * a.hours
  )[0];
}

export function getUsagePercentage(appliance, appliances) {
  const total = appliances.reduce((s, a) => s + a.wattage * a.hours, 0);
  if (!total) return 0;
  return Math.round(((appliance.wattage * appliance.hours) / total) * 100);
}

export const CHART_COLORS = [
  '#4fd1c5', '#7c6aff', '#f6ad55', '#fc8181', '#63b3ed',
  '#68d391', '#f687b3', '#76e4f7', '#b794f4', '#fbd38d',
];
