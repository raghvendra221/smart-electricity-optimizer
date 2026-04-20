// services/api.js
// Reusable fetch wrapper — swap BASE_URL to point at your real backend

const BASE_URL = 'http://localhost:8000/api';

const getToken = () => localStorage.getItem('seuo_token');

async function request(path, options = {}) {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };

  const response = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Request failed' }));
    throw new Error(error.message || `HTTP ${response.status}`);
  }

  return response.json();
}

// ── Auth ─────────────────────────────────────────────────────────────────────

export async function loginUser(email, password) {
  return request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export async function registerUser(name, email, password) {
  return request('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ name, email, password }),
  });
}

// ── Dashboard ─────────────────────────────────────────────────────────────────

export async function getDashboardData() {
  return request('/dashboard');
}

// ── Appliances ────────────────────────────────────────────────────────────────

export async function getAppliances() {
  return request('/appliances');
}

export async function addAppliance(data) {
  return request('/appliances', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateAppliance(id, data) {
  return request(`/appliances/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteAppliance(id) {
  return request(`/appliances/${id}`, { method: 'DELETE' });
}

// ── Usage ─────────────────────────────────────────────────────────────────────

export async function getUsage(params = {}) {
  const query = new URLSearchParams(params).toString();
  return request(`/usage${query ? '?' + query : ''}`);
}

export async function logUsage(data) {
  return request('/usage', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// ── Insights ──────────────────────────────────────────────────────────────────

export async function getInsights() {
  return request('/insights');
}
