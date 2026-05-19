// services/api.js
// Reusable fetch wrapper — swap BASE_URL to point at your real backend

const BASE_URL = 'http://127.0.0.1:8000/api';

const getToken = () => localStorage.getItem('seuo_token');

let refreshPromise = null;

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
  return request('/auth/login/', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export async function registerUser(name, email, password) {
  return request('/auth/register/', {
    method: 'POST',
    body: JSON.stringify({ name, email, password }),
  });
}

// ── Dashboard ─────────────────────────────────────────────────────────────────

export async function getDashboard() {
  return request('/dashboard/dashboard/');
}


// ── Appliances ─────────────────────────────────────────────

export async function getAppliances() {
  return request('/appliances/'); // ✅ slash
}

export async function addAppliance(data) {
  return request('/appliances/add/', { // ✅ correct endpoint
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateAppliance(id, data) {
  return request(`/appliances/${id}/`, { // ✅ slash
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteAppliance(id) {
  return request(`/appliances/${id}/delete/`, { // ✅ correct endpoint
    method: 'DELETE',
  });
}

export async function getApplianceStats() {
  return request('/appliances/stats/');
}

// ── Usage ─────────────────────────────────────────────────────────────────────

export async function getUsageSummary() {
  return request('/usage/summary/');
}

export async function getApplianceUsage() {
  return request('/usage/appliance/');
}

export async function logUsage({ applianceId, hours }) {
  return request('/usage/add/', {
    method: 'POST',
    body: JSON.stringify({
      appliance_id: applianceId,
      hours_used: hours
    }),
  });
}

export async function getUsageHistory(range = '7d') {
  return request(`/usage/history/?range=${range}`);
}

export async function getUsageLogs() {
  return request('/usage/logs/');
}

// ── Insights ──────────────────────────────────────────────────────────────────

export async function getInsights() {
  return request('/insight/ai-insights/');
}

export async function getPrediction() {
  return request('/usage/predict/');
}

export async function getAIInsights() {
  return request('/insight/ai-insights/');
}

export async function applyAutomation(applianceId = null) {
  return request('/automation/apply/', {
    method: 'POST',
    body: JSON.stringify({ appliance_id: applianceId })
  });
}

export async function removeAutomation(applianceId = null) {
  return request('/automation/remove/', {
    method: 'POST',
    body: JSON.stringify({ appliance_id: applianceId })
  });
}

export async function sendChatMessage(message) {
  return request('/chat/', {
    method: 'POST',
    body: JSON.stringify({ message }),
  });
}
