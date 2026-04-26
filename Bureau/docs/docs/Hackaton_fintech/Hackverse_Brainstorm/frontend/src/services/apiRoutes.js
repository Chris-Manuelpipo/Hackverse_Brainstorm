const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

async function request(endpoint, options = {}) {
  const isFormData = options.body instanceof FormData;
  const config = {
    headers: {
      ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
      ...options.headers,
    },
    ...options,
  };

  const response = await fetch(`${API_BASE}${endpoint}`, config);
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.detail || `HTTP ${response.status}`);
  }

  return response.json();
}

export const api = {
  accounts: {
    list: () => request('/accounts'),
    get: (id) => request(`/accounts/${id}`),
    create: (data) => request('/accounts', { method: 'POST', body: JSON.stringify(data) }),
    update: (id, data) => request(`/accounts/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id) => request(`/accounts/${id}`, { method: 'DELETE' }),
    balance: (id) => request(`/accounts/${id}/balance`),
  },
  transactions: {
    list: (filters) => {
      const params = new URLSearchParams(filters).toString();
      return request(`/transactions${params ? `?${params}` : ''}`);
    },
    get: (id) => request(`/transactions/${id}`),
    create: (data) => request('/transactions', { method: 'POST', body: JSON.stringify(data) }),
    update: (id, data) => request(`/transactions/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id) => request(`/transactions/${id}`, { method: 'DELETE' }),
    cancel: (id) => request(`/transactions/${id}/cancel`, { method: 'POST' }),
    uploadAttachment: (txId, formData, type = 'IMAGE') => request(`/transactions/${txId}/attachments?type=${type}`, { method: 'POST', body: formData }),
  },

  categories: {
    list: () => request('/categories'),
    get: (id) => request(`/categories/${id}`),
    create: (data) => request('/categories', { method: 'POST', body: JSON.stringify(data) }),
    update: (id, data) => request(`/categories/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id) => request(`/categories/${id}`, { method: 'DELETE' }),
  },

  settings: {
    get: (key) => request(`/settings/${key}`),
    set: (key, value) => request(`/settings/${key}`, { method: 'POST', body: JSON.stringify({ value }) }),
  },

  reports: {
    bilan: (startDate, endDate) => request(`/reports/bilan?start=${startDate}&end=${endDate}`),
    resultat: (startDate, endDate) => request(`/reports/resultat?start=${startDate}&end=${endDate}`),
    cashflow: () => request('/reports/cashflow'),
    share: (data) => request('/reports/share', { method: 'POST', body: JSON.stringify(data) }),
    getPublic: (token) => request(`/public/reports/${token}`),
  },

  auth: {
    login: (email, password) => request('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
    logout: () => request('/auth/logout', { method: 'POST' }),
    me: () => request('/auth/me'),
  },

  sync: {
    push: () => request('/sync/push', { method: 'POST' }),
    pull: () => request('/sync/pull'),
    status: () => request('/sync/status'),
  },
};

export default api;