// Dos bases distintas a propósito: el login/perfil viven en el sistema principal (el bot no
// tiene su propio login), todo lo demás es la API propia de este bot. El token que devuelve
// /main-api/auth/login es el mismo JWT que valida el backend del bot (mismo JWT_SECRET),
// así que un solo login sirve para pegarle a las dos.
const MAIN_API_BASE = import.meta.env.VITE_MAIN_API_URL || '/main-api';
const BOT_API_BASE = import.meta.env.VITE_API_URL || '/api';

const TOKEN_KEY = 'mydents_bot_token';

async function request(base, endpoint, options = {}) {
  const token = localStorage.getItem(TOKEN_KEY);

  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
    ...options,
  };

  const response = await fetch(`${base}${endpoint}`, config);

  if (response.status === 401) {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem('mydents_bot_user');
    window.location.href = '/login';
    throw new Error('Sesión expirada.');
  }

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Error en la solicitud.');
  }
  return data;
}

const mainApi = (endpoint, options) => request(MAIN_API_BASE, endpoint, options);
const botApi = (endpoint, options) => request(BOT_API_BASE, endpoint, options);

export const api = {
  TOKEN_KEY,
  auth: {
    login: (email, password) => mainApi('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
    profile: () => mainApi('/auth/profile'),
  },
  conversations: {
    list: (params = {}) => {
      const query = new URLSearchParams(params).toString();
      return botApi(`/conversations${query ? `?${query}` : ''}`);
    },
    getMessages: (id) => botApi(`/conversations/${id}/messages`),
    sendMessage: (id, text) => botApi(`/conversations/${id}/messages`, { method: 'POST', body: JSON.stringify({ text }) }),
  },
  stats: {
    get: () => botApi('/stats'),
    recentReminders: () => botApi('/stats/reminders'),
  },
  channelConfigs: {
    list: () => botApi('/channel-configs'),
    update: (id, data) => botApi(`/channel-configs/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  },
};
