const BASE_URL = 'https://wms-server-production-dc2a.up.railway.app';
const API_BASE = `${BASE_URL}/api`;

const DEMO_MODE = false; // FIXED: was true, caused silent 401 failures

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
  try { await request('POST', '/auth/logout'); } catch (_) {}
  clearToken();
  window.location.href = '/login.html';
}

// ─── Token refresh ────────────────────────────────────────────────────────────

async function tryRefresh() {
  try {
    const res = await fetch(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
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

  if (res.status === 401 && _retry) {
    const refreshed = await tryRefresh();
    if (refreshed) return request(method, path, body, false);
    clearToken();
    window.location.href = '/login.html';
    return;
  }

  if (res.status === 401) {
    clearToken();
    window.location.href = '/login.html';
    return;
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || `Error ${res.status}`);
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
  updateStatus: (id, status, note = '') => request('PATCH', `/orders/${id}/status`, { status, note }),
  packingQueue: () => request('GET', '/orders/packing'),
  claim: (id) => request('PATCH', `/orders/${id}/claim`),
};

// ─── UI Utilities ─────────────────────────────────────────────────────────────

function escapeHtml(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function toast(message, type = 'success') {
  const el = document.createElement('div');
  el.className = `toast toast-${type}`;
  el.textContent = message;
  document.body.appendChild(el);
  requestAnimationFrame(() => el.classList.add('show'));
  setTimeout(() => {
    el.classList.remove('show');
    setTimeout(() => el.remove(), 300);
  }, 3000);
}

function showModal(id) { document.getElementById(id).classList.add('open'); }
function closeModal(id) { document.getElementById(id).classList.remove('open'); }

document.addEventListener('click', (e) => {
  if (e.target.classList.contains('modal')) e.target.classList.remove('open');
});

function statusBadge(status) {
  const map = {
    pending: ['badge-yellow', 'Pending'],
    packed:  ['badge-blue',   'Packed'],
    shipped: ['badge-green',  'Shipped'],
  };
  const [cls, label] = map[status] || ['badge-grey', status];
  return `<span class="badge ${cls}">${label}</span>`;
}

function formatCurrency(n) {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(n) || 0);
}

function formatDate(d) {
  return new Date(d).toLocaleString('en-US', { dateStyle: 'short', timeStyle: 'short' });
}

function markActiveNav() {
  const page = location.pathname.split('/').pop();
  document.querySelectorAll('.nav-link').forEach((a) => {
    a.classList.toggle('active', a.getAttribute('href') === page);
  });
}

function renderUser() {
  const u = getUser();
  const el = document.getElementById('user-name');
  if (el && u) el.textContent = u.name;
}