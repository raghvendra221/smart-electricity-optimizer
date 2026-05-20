// services/api.js
// Reusable fetch wrapper — swap BASE_URL to point at your real backend

const BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api';

const getToken = () => localStorage.getItem('seuo_token');

let refreshPromise = null;

// ── In-Memory API Cache ──────────────────────────────────────────────────────
const memoryCache = new Map();

export function getCachedData(key) {
  const cached = memoryCache.get(key);
  if (!cached) return null;
  // Cache expires after 5 minutes
  if (Date.now() - cached.timestamp > 5 * 60 * 1000) {
    memoryCache.delete(key);
    return null;
  }
  return cached.data;
}

export function setCachedData(key, data) {
  memoryCache.set(key, {
    data,
    timestamp: Date.now()
  });
}

export function clearCache(keys = []) {
  if (keys.length === 0) {
    memoryCache.clear();
  } else {
    keys.forEach(k => memoryCache.delete(k));
  }
}

async function request(path, options = {}) {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };

  let response = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers,
  });

  // Intercept 401/403 for Token Refresh
  if ((response.status === 401 || response.status === 403) && !path.includes('/auth/')) {
    const refresh = localStorage.getItem('seuo_refresh');
    if (refresh) {
      try {
        if (!refreshPromise) {
          refreshPromise = fetch(`${BASE_URL}/auth/refresh/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refresh })
          }).then(res => {
            if (!res.ok) throw new Error("Refresh failed");
            return res.json();
          }).then(data => {
            localStorage.setItem('seuo_token', data.access);
            return data.access;
          }).finally(() => {
            refreshPromise = null;
          });
        }
        
        const newAccess = await refreshPromise;
        headers.Authorization = `Bearer ${newAccess}`;
        
        // Retry original request
        response = await fetch(`${BASE_URL}${path}`, {
          ...options,
          headers,
        });
      } catch (err) {
        // Refresh failed (token totally expired)
        localStorage.removeItem('seuo_token');
        localStorage.removeItem('seuo_refresh');
        localStorage.removeItem('seuo_user');
        window.location.href = '/login';
        throw new Error('Session expired. Please log in again.');
      }
    }
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Request failed' }));
    throw new Error(error.message || `HTTP ${response.status}`);
  }

  return response.json();
}

// ── Auth ─────────────────────────────────────────────────────────────────────

export async function loginUser(email, password) {
  clearCache(); // clear any previous cache on login
  return request('/auth/login/', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export async function registerUser(name, email, password) {
  clearCache(); // clear any previous cache on register
  return request('/auth/register/', {
    method: 'POST',
    body: JSON.stringify({ name, email, password }),
  });
}

// ── Dashboard ─────────────────────────────────────────────────────────────────

export async function getDashboard() {
  const data = await request('/dashboard/dashboard/');
  setCachedData('dashboard', data);
  return data;
}


// ── Appliances ─────────────────────────────────────────────

export async function getAppliances() {
  const data = await request('/appliances/');
  setCachedData('appliances', data);
  return data;
}

export async function addAppliance(data) {
  const res = await request('/appliances/add/', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  clearCache(['appliances', 'applianceStats', 'dashboard', 'insights']);
  return res;
}

export async function updateAppliance(id, data) {
  const res = await request(`/appliances/${id}/`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
  clearCache(['appliances', 'applianceStats', 'dashboard', 'insights']);
  return res;
}

export async function deleteAppliance(id) {
  const res = await request(`/appliances/${id}/delete/`, {
    method: 'DELETE',
  });
  clearCache(['appliances', 'applianceStats', 'dashboard', 'insights']);
  return res;
}

export async function getApplianceStats() {
  const data = await request('/appliances/stats/');
  setCachedData('applianceStats', data);
  return data;
}

// ── Usage ─────────────────────────────────────────────────────────────────────

export async function getUsageSummary() {
  const data = await request('/usage/summary/');
  setCachedData('usageSummary', data);
  return data;
}

export async function getApplianceUsage() {
  const data = await request('/usage/appliance/');
  setCachedData('applianceUsage', data);
  return data;
}

export async function logUsage({ applianceId, hours }) {
  const res = await request('/usage/add/', {
    method: 'POST',
    body: JSON.stringify({
      appliance_id: applianceId,
      hours_used: hours
    }),
  });
  clearCache([
    'usageSummary',
    'usageLogs',
    'usageHistory_7d',
    'usageHistory_30d',
    'usageHistory_365d',
    'applianceStats',
    'dashboard',
    'insights'
  ]);
  return res;
}

export async function getUsageHistory(range = '7d') {
  const data = await request(`/usage/history/?range=${range}`);
  setCachedData(`usageHistory_${range}`, data);
  return data;
}

export async function getUsageLogs() {
  const data = await request('/usage/logs/');
  setCachedData('usageLogs', data);
  return data;
}

// ── Insights ──────────────────────────────────────────────────────────────────

export async function getInsights() {
  const data = await request('/insight/ai-insights/');
  setCachedData('insights', data);
  return data;
}

export async function getPrediction() {
  const data = await request('/usage/predict/');
  setCachedData('prediction', data);
  return data;
}

export async function getAIInsights() {
  const data = await request('/insight/ai-insights/');
  setCachedData('insights', data);
  return data;
}

export async function applyAutomation(applianceId = null) {
  const res = await request('/automation/apply/', {
    method: 'POST',
    body: JSON.stringify({ appliance_id: applianceId })
  });
  clearCache(['insights', 'dashboard', 'appliances', 'applianceStats']);
  return res;
}

export async function removeAutomation(applianceId = null) {
  const res = await request('/automation/remove/', {
    method: 'POST',
    body: JSON.stringify({ appliance_id: applianceId })
  });
  clearCache(['insights', 'dashboard', 'appliances', 'applianceStats']);
  return res;
}

export async function sendChatMessage(message) {
  return request('/chat/', {
    method: 'POST',
    body: JSON.stringify({ message }),
  });
}
