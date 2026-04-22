const BASE_URL = 'https://wms-server-production-dc2a.up.railway.app';
const API_BASE = `${BASE_URL}/api`;

const DEMO_MODE = false; // ← FIXED: was true, causing silent 401 failures

// ─── Token helpers ────────────────────────────────────────────────────────────

function getToken() { return localStorage.getItem('accessToken'); }
function setToken(t) { localStorage.setItem('accessToken', t); }
function clearToken() { localStorage.removeItem('accessToken'); localStorage.removeItem('user'); }
function getUser() {
  try { return JSON.parse(localStorage.getItem('user')); } catch { return null; }
}
function setUser(u) { localStorage.setItem('user', JSON.stringify(u)); }

function requireAuth() {
  if (!getToken()) { window.location.href = '/login.html'; }
}

async function logout() {
  try {
    await request('POST', '/auth/logout');
  } catch (_) { /* ignore — clear local state regardless */ }
  clearToken();
  window.location.href = '/login.html';
}

// ─── Token refresh ────────────────────────────────────────────────────────────

async function tryRefresh() {
  try {
    const res = await fetch(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      credentials: 'include', // sends httpOnly refreshToken cookie
    });
    if (!res.ok) return false;
    const data = await res.json();
    setToken(data.accessToken);
    if (data.user) setUser(data.user);
    return true;
  } catch {
    return false;
  }
}

// ─── Core fetch wrapper ───────────────────────────────────────────────────────

async function request(method, path, body = null, _retry = true) {
  const headers = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    credentials: 'include',
    body: body ? JSON.stringify(body) : null,
  });

  // Auto-refresh expired access token (one retry)
  if (res.status === 401 && _retry) {
    const refreshed = await tryRefresh();
    if (refreshed) return request(method, path, body, false);
    clearToken();
    window.location.href = '/login.html';
    return;
  }

  // Non-retried 401 or other auth failures
  if (res.status === 401) {
    clearToken();
    window.location.href = '/login.html';
    return;
  }

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const msg = data.message || `Error ${res.status}`;
    throw new Error(msg);
  }

  return data;
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

const Auth = {
  async login(email, password) {
    const data = await request('POST', '/auth/login', { email, password });
    setToken(data.accessToken);
    setUser(data.user);
    return data;
  },
};

// ─── Products ─────────────────────────────────────────────────────────────────

const Products = {
  list: (params = {}) => request('GET', '/products?' + new URLSearchParams(params)),
  get: (id) => request('GET', `/products/${id}`),
  create: (body) => request('POST', '/products', body),
  update: (id, body) => request('PATCH', `/products/${id}`, body),
  updateStock: (id, adjustment) => request('PATCH', `/products/${id}/stock`, { adjustment }),
  remove: (id) => request('DELETE', `/products/${id}`),
};

// ─── Orders ───────────────────────────────────────────────────────────────────

const Orders = {
  list: (params = {}) => request('GET', '/orders?' + new URLSearchParams(params)),
  get: (id) => request('GET', `/orders/${id}`),
  create: (body) => request('POST', '/orders', body),
  updateStatus: (id, status, note) => request('PATCH', `/orders/${id}/status`, { status, note }),
  getPackingQueue: () => request('GET', '/orders/packing'),
  claim: (id) => request('PATCH', `/orders/${id}/claim`),
};

// ─── Utilities ────────────────────────────────────────────────────────────────

function escapeHtml(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function toast(msg, type = 'success') {
  const el = document.createElement('div');
  el.className = `toast toast-${type}`;
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => el.classList.add('show'), 10);
  setTimeout(() => { el.classList.remove('show'); setTimeout(() => el.remove(), 300); }, 3000);
}

function showModal(id) { document.getElementById(id)?.classList.add('open'); }
function closeModal(id) { document.getElementById(id)?.classList.remove('open'); }

function markActiveNav() {
  const path = window.location.pathname.split('/').pop() || 'dashboard.html';
  document.querySelectorAll('.nav-link').forEach(a => {
    const href = a.getAttribute('href')?.split('/').pop();
    if (href === path) a.classList.add('active');
  });
}

function renderUser() {
  const user = getUser();
  if (!user) return;
  const initials = (user.name || '?')[0].toUpperCase();
  document.querySelectorAll('.user-avatar').forEach(el => el.textContent = initials);
  document.querySelectorAll('.user-name').forEach(el => el.textContent = user.name || '');
  document.querySelectorAll('.user-role').forEach(el => el.textContent = user.role || '');
}
function formatCurrency(amount, currency = 'USD') {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(amount || 0);
}