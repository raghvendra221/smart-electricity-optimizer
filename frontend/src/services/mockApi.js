// services/mockApi.js
// Drop-in mock for local development. Mirrors the real api.js interface.

const delay = (ms) => new Promise((r) => setTimeout(r, ms));

const MOCK_APPLIANCES = [
  { _id: '1', name: 'Air Conditioner', wattage: 2000, hours: 8 },
  { _id: '2', name: 'Refrigerator', wattage: 150, hours: 24 },
  { _id: '3', name: 'Washing Machine', wattage: 500, hours: 1 },
  { _id: '4', name: 'LED TV', wattage: 120, hours: 6 },
  { _id: '5', name: 'Water Heater', wattage: 2000, hours: 1 },
];

let appliances = [...MOCK_APPLIANCES];

export async function loginUser(email, password) {
  await delay(700);
  if (!email || !password) throw new Error('Email and password are required');
  if (password.length < 6) throw new Error('Password must be at least 6 characters');
  return {
    token: 'mock_jwt_' + btoa(email),
    user: { _id: '1', email, name: email.split('@')[0] },
  };
}

export async function registerUser(name, email, password) {
  await delay(900);
  if (!name || !email || !password) throw new Error('All fields are required');
  if (password.length < 6) throw new Error('Password must be at least 6 characters');
  return {
    token: 'mock_jwt_' + btoa(email),
    user: { _id: '1', email, name },
  };
}

export async function getDashboardData() {
  await delay(400);
  const totalDaily = appliances.reduce(
    (s, a) => s + (a.wattage * a.hours) / 1000,
    0
  );
  return {
    totalUnits: parseFloat(totalDaily.toFixed(2)),
    estimatedBill: Math.round(totalDaily * 30 * 9),
    monthlyTrend: [180, 210, 195, 240, 265, Math.round(totalDaily * 30)],
    dailyUsage: [9.2, 11.4, 10.8, 12.1, 9.8, 13.2, 11.6],
    months: ['Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr'],
    days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
  };
}

export async function getAppliances() {
  await delay(300);
  return { appliances: [...appliances] };
}

export async function addAppliance(data) {
  await delay(400);
  const newItem = { _id: Date.now().toString(), ...data };
  appliances.push(newItem);
  return { appliance: newItem };
}

export async function updateAppliance(id, data) {
  await delay(300);
  appliances = appliances.map((a) => (a._id === id ? { ...a, ...data } : a));
  return { appliance: appliances.find((a) => a._id === id) };
}

export async function deleteAppliance(id) {
  await delay(300);
  appliances = appliances.filter((a) => a._id !== id);
  return { success: true };
}

export async function getUsage() {
  await delay(400);
  return {
    usage: appliances.map((a) => ({
      applianceId: a._id,
      name: a.name,
      wattage: a.wattage,
      hours: a.hours,
      dailyKwh: parseFloat(((a.wattage * a.hours) / 1000).toFixed(2)),
      monthlyCost: Math.round(((a.wattage * a.hours) / 1000) * 30 * 9),
    })),
  };
}

export async function logUsage(data) {
  await delay(300);
  const app = appliances.find((a) => a._id === data.applianceId);
  if (app) app.hours = data.hours;
  return { success: true };
}

export async function getInsights() {
  await delay(500);
  const sorted = [...appliances].sort(
    (a, b) => b.wattage * b.hours - a.wattage * a.hours
  );
  const top = sorted[0];
  return {
    insights: [
      {
        _id: '1',
        type: 'warning',
        icon: '❄️',
        title: `${top?.name || 'AC'} consumes highest electricity`,
        description: `Your ${top?.name} uses the most power at ${top?.wattage}W for ${top?.hours}h/day. Reducing by 2 hours could save significantly.`,
        potentialSaving: 624,
      },
      {
        _id: '2',
        type: 'tip',
        icon: '💡',
        title: 'LED upgrade recommended',
        description: 'Switching to LED bulbs reduces lighting costs by up to 75%. Estimated 15% reduction in monthly bills.',
        potentialSaving: 180,
      },
      {
        _id: '3',
        type: 'schedule',
        icon: '🕐',
        title: 'Shift to off-peak hours',
        description: 'Running heavy appliances after 10 PM qualifies for off-peak tariffs in most utility zones.',
        potentialSaving: 95,
      },
      {
        _id: '4',
        type: 'alert',
        icon: '🔥',
        title: 'Water heater efficiency low',
        description: 'Consider upgrading to a solar water heater to eliminate heating costs entirely.',
        potentialSaving: 420,
      },
      {
        _id: '5',
        type: 'good',
        icon: '🌱',
        title: 'Refrigerator is running efficiently',
        description: 'Keep condenser coils clean every 6 months for optimal efficiency. No action needed now.',
        potentialSaving: 0,
      },
    ],
  };
}
