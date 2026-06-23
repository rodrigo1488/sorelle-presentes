const TOKEN_KEY = 'sorelle_access_token';
const API_BASE = import.meta.env.VITE_API_URL || '/api';

class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
    this.name = 'ApiError';
  }
}

function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

function setToken(token) {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }
}

async function apiFetch(path, options = {}) {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new ApiError(body.message || 'Erro na requisição', response.status);
  }

  if (response.status === 204) return null;
  return response.json();
}

function createEntityClient(resourcePath) {
  return {
    async list(sort = '-created_date', limit = 100) {
      const params = new URLSearchParams();
      if (sort) params.set('sort', sort);
      if (limit) params.set('limit', String(limit));
      return apiFetch(`/${resourcePath}?${params}`);
    },

    async filter(filters = {}, sort = '-created_date', limit = 100) {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.set(key, String(value));
        }
      });
      if (sort) params.set('sort', sort);
      if (limit) params.set('limit', String(limit));
      return apiFetch(`/${resourcePath}/filter?${params}`);
    },

    async create(data) {
      return apiFetch(`/${resourcePath}`, {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },

    async update(id, data) {
      return apiFetch(`/${resourcePath}/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      });
    },

    async delete(id) {
      return apiFetch(`/${resourcePath}/${id}`, {
        method: 'DELETE',
      });
    },
  };
}

const auth = {
  getToken,
  setToken,

  async loginViaEmailPassword(email, password) {
    const result = await apiFetch('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    setToken(result.access_token);
    return result;
  },

  async register({ email, password }) {
    const result = await apiFetch('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    setToken(result.access_token);
    return result;
  },

  async me() {
    return apiFetch('/auth/me');
  },

  logout(redirectUrl) {
    setToken(null);
    if (redirectUrl) {
      window.location.href = '/login';
    }
  },

  redirectToLogin(returnUrl) {
    const params = returnUrl ? `?returnUrl=${encodeURIComponent(returnUrl)}` : '';
    window.location.href = `/login${params}`;
  },

  async resetPasswordRequest(email) {
    return apiFetch('/auth/reset-password-request', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  },

  async resetPassword({ resetToken, newPassword }) {
    return apiFetch('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ resetToken, newPassword }),
    });
  },

  loginWithProvider() {
    throw new Error('Login com Google não disponível. Use e-mail e senha.');
  },

  async verifyOtp() {
    throw new Error('Verificação OTP não necessária.');
  },

  async resendOtp() {
    throw new Error('Verificação OTP não necessária.');
  },
};

const settings = {
  async get() {
    return apiFetch('/settings');
  },

  async update(data) {
    return apiFetch('/settings', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },
};

const images = {
  async generateScene({ image, mime_type, product_name, category, materials }) {
    return apiFetch('/images/generate-scene', {
      method: 'POST',
      body: JSON.stringify({ image, mime_type, product_name, category, materials }),
    });
  },
};

export const api = {
  auth,
  settings,
  images,
  entities: {
    Product: createEntityClient('products'),
    Order: createEntityClient('orders'),
    Affiliate: createEntityClient('affiliates'),
    AffiliateConversion: createEntityClient('affiliate-conversions'),
    CartItem: createEntityClient('cart-items'),
  },
};

export default api;
