const API_BASE = '/api';

function getHeaders() {
  const token = localStorage.getItem('fitmanage_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };
}

async function request(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      ...getHeaders(),
      ...options.headers
    }
  });

  if (response.status === 401) {
    // If unauthorized, clear token if expired (do not kick member portal users to staff login)
    if (!window.location.pathname.includes('/login') && !window.location.pathname.startsWith('/portal')) {
      localStorage.removeItem('fitmanage_token');
      localStorage.removeItem('fitmanage_user');
      localStorage.removeItem('fitmanage_gym');
      window.location.href = '/login';
    }
  }

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Something went wrong. Please try again.');
  }

  return data;
}

export const api = {
  // Auth
  login: (credentials) => request('/auth/login', { method: 'POST', body: JSON.stringify(credentials) }),
  register: (details) => request('/auth/register', { method: 'POST', body: JSON.stringify(details) }),
  getMe: () => request('/auth/me'),
  getDemoUsers: () => request('/auth/demo-users'),

  // Dashboard
  getDashboardStats: () => request('/dashboard/stats'),

  // Customers
  getCustomers: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/customers?${query}`);
  },
  getCustomer: (id) => request(`/customers/${id}`),
  createCustomer: (data) => request('/customers', { method: 'POST', body: JSON.stringify(data) }),
  updateCustomer: (id, data) => request(`/customers/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteCustomer: (id) => request(`/customers/${id}`, { method: 'DELETE' }),

  // Memberships
  getMemberships: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/memberships?${query}`);
  },
  createMembership: (data) => request('/memberships', { method: 'POST', body: JSON.stringify(data) }),
  renewMembership: (id, data) => request(`/memberships/${id}/renew`, { method: 'POST', body: JSON.stringify(data) }),
  cancelMembership: (id, reason) => request(`/memberships/${id}/cancel`, { method: 'PATCH', body: JSON.stringify({ reason }) }),

  // Payments
  getPayments: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/payments?${query}`);
  },
  recordPayment: (data) => request('/payments', { method: 'POST', body: JSON.stringify(data) }),
  getReceipt: (id) => request(`/payments/${id}/receipt`),

  // Reminders
  getReminders: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/reminders?${query}`);
  },
  logReminder: (data) => request('/reminders', { method: 'POST', body: JSON.stringify(data) }),

  // Reports
  getAnalytics: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/reports/analytics${query ? '?' + query : ''}`);
  },

  // Staff
  getStaff: () => request('/staff'),
  addStaff: (data) => request('/staff', { method: 'POST', body: JSON.stringify(data) }),
  deleteStaff: (id) => request(`/staff/${id}`, { method: 'DELETE' }),

  // Settings
  getSettings: () => request('/settings'),
  updateGymProfile: (data) => request('/settings/profile', { method: 'PUT', body: JSON.stringify(data) }),
  testWhatsAppGateway: (data) => request('/settings/test-whatsapp', { method: 'POST', body: JSON.stringify(data) }),
  testMetaCloudAPI: (data) => request('/settings/test-meta', { method: 'POST', body: JSON.stringify(data) }),
  getWhatsAppQR: () => request('/settings/whatsapp-qr'),
  reconnectWhatsAppQR: () => request('/settings/whatsapp-qr/reconnect', { method: 'POST' }),
  disconnectWhatsAppQR: () => request('/settings/whatsapp-qr/disconnect', { method: 'POST' }),
  addPlan: (data) => request('/settings/plans', { method: 'POST', body: JSON.stringify(data) }),
  updatePlan: (id, data) => request(`/settings/plans/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deletePlan: (id) => request(`/settings/plans/${id}`, { method: 'DELETE' }),
  scanMultiStageExpiry: () => request('/reminders/scan-multi-stage', { method: 'POST' }),
  getMultiStageConfig: () => request('/reminders/multi-stage-config'),
  getBroadcastPreview: (target) => request(`/settings/broadcast-preview?target=${encodeURIComponent(target)}`),
  broadcastWhatsApp: (data) => request('/settings/broadcast', { method: 'POST', body: JSON.stringify(data) }),
  getOccupancy: () => request('/settings/occupancy'),
  updateOccupancy: (data) => request('/settings/occupancy', { method: 'PUT', body: JSON.stringify(data) }),

  // Member Self-Service Portal
  portalSendOtp: (phone) => request('/portal/send-otp', { method: 'POST', body: JSON.stringify({ phone }) }),
  portalVerifyOtp: (phone, otp) => request('/portal/verify-otp', { method: 'POST', body: JSON.stringify({ phone, otp }) }),
  portalGetMe: (token) => {
    return fetch('/api/portal/me', {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      }
    }).then(async (res) => {
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load member portal.');
      return data;
    });
  },
  portalGetReceipt: (id, token) => {
    return fetch(`/api/portal/receipt/${id}`, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      }
    }).then(async (res) => {
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load receipt.');
      return data;
    });
  },

  // Attendance & Check-in Scanner
  checkInMember: (data) => request('/attendance/check-in', { method: 'POST', body: JSON.stringify(data) }),
  getAttendance: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return request(`/attendance?${q}`);
  },
  getAttendanceStats: () => request('/attendance/stats'),
  deleteAttendanceRecord: (id) => request(`/attendance/${id}`, { method: 'DELETE' }),

  // Online Renewal & Payment Gateway
  getOnlinePayDetails: (token) => request(`/online-pay/${token}`),
  createOnlineOrder: (data) => request('/online-pay/create-order', { method: 'POST', body: JSON.stringify(data) }),
  verifyOnlinePayment: (data) => request('/online-pay/verify', { method: 'POST', body: JSON.stringify(data) }),
};
