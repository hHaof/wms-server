const BASE_URL = 'https://wms-server-production-dc2a.up.railway.app';
const API_BASE = `${BASE_URL}/api`;

// ─── Token helpers ────────────────────────────────────────────────────────────

function getToken() { return localStorage.getItem('accessToken'); }
function setToken(t) { localStorage.setItem('accessToken', t); }
function clearToken() { localStorage.removeItem('accessToken'); localStorage.removeItem('user'); }
function getUser() {
  try { return JSON.parse(localStorage.getItem('user')); } catch { return null; }
}
function setUser(u) { localStorage.setItem('user', JSON.stringify(u)); }

// Redirect to login if no token (call at top of every protected page)
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

// ─── Core fetch wrapper ───────────────────────────────────────────────────────

async function request(method, path, body = null) {
  const headers = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    credentials: 'include',
    body: body ? JSON.stringify(body) : null,
  });

  // Auto-logout on auth failure
  if (res.status === 401) {
    clearToken();
    window.location.href = '/login.html';
    return;
  }

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const msg = data.message || `Lỗi ${res.status}`;
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
  updateStatus: (id, status, note = '') => request('PATCH', `/orders/${id}/status`, { status, note }),
  packingQueue: () => request('GET', '/orders/packing'),
  claim: (id) => request('PATCH', `/orders/${id}/claim`),
};

// ─── UI Utilities ─────────────────────────────────────────────────────────────

// Escapes user-controlled strings before inserting into innerHTML.
// Without this, a product named "<img onerror=...>" executes arbitrary JS
// in every warehouse worker's browser (stored XSS).
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

// Close modal when clicking backdrop
document.addEventListener('click', (e) => {
  if (e.target.classList.contains('modal')) e.target.classList.remove('open');
});

function statusBadge(status) {
  const map = {
    pending: ['badge-yellow', 'Chờ đóng gói'],
    packed:  ['badge-blue',   'Đã đóng gói'],
    shipped: ['badge-green',  'Đã giao'],
  };
  const [cls, label] = map[status] || ['badge-grey', status];
  return `<span class="badge ${cls}">${label}</span>`;
}

function formatCurrency(n) {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n);
}

function formatDate(d) {
  return new Date(d).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' });
}

// Highlight active sidebar link based on current page
function markActiveNav() {
  const page = location.pathname.split('/').pop();
  document.querySelectorAll('.nav-link').forEach((a) => {
    a.classList.toggle('active', a.getAttribute('href') === page);
  });
}

// Render logged-in user name in topbar
function renderUser() {
  const u = getUser();
  const el = document.getElementById('user-name');
  if (el && u) el.textContent = u.name;
}
