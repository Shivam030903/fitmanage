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
    // If unauthorized, clear token if expired
    if (!window.location.pathname.includes('/login')) {
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
  getAnalytics: () => request('/reports/analytics'),

  // Staff
  getStaff: () => request('/staff'),
  addStaff: (data) => request('/staff', { method: 'POST', body: JSON.stringify(data) }),
  deleteStaff: (id) => request(`/staff/${id}`, { method: 'DELETE' }),

  // Settings
  getSettings: () => request('/settings'),
  updateGymProfile: (data) => request('/settings/profile', { method: 'PUT', body: JSON.stringify(data) }),
  addPlan: (data) => request('/settings/plans', { method: 'POST', body: JSON.stringify(data) }),
  updatePlan: (id, data) => request(`/settings/plans/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deletePlan: (id) => request(`/settings/plans/${id}`, { method: 'DELETE' }),
};
