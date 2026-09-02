import { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../api/client';

const AuthContext = createContext(null);
const USER_KEY = 'mydents_bot_user';
const PERMISSIONS_KEY = 'mydents_bot_permissions';
const MODULES_KEY = 'mydents_bot_modules';

function splitEntitlements(data) {
  const { tenant, permissions, modules, ...user } = data;
  return { user, permissions: permissions || [], modules: modules || [] };
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem(USER_KEY);
    return saved ? JSON.parse(saved) : null;
  });
  const [permissions, setPermissions] = useState(() => {
    const saved = localStorage.getItem(PERMISSIONS_KEY);
    return saved ? JSON.parse(saved) : [];
  });
  const [modules, setModules] = useState(() => {
    const saved = localStorage.getItem(MODULES_KEY);
    return saved ? JSON.parse(saved) : [];
  });
  const [loading, setLoading] = useState(true);

  const persist = ({ user, permissions, modules }) => {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    localStorage.setItem(PERMISSIONS_KEY, JSON.stringify(permissions));
    localStorage.setItem(MODULES_KEY, JSON.stringify(modules));
    setUser(user);
    setPermissions(permissions);
    setModules(modules);
  };

  const clear = () => {
    localStorage.removeItem(api.TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(PERMISSIONS_KEY);
    localStorage.removeItem(MODULES_KEY);
    setUser(null);
    setPermissions([]);
    setModules([]);
  };

  useEffect(() => {
    const token = localStorage.getItem(api.TOKEN_KEY);
    if (token && !user) {
      api.auth.profile()
        .then((profile) => persist(splitEntitlements(profile)))
        .catch(() => clear())
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email, password) => {
    const result = await api.auth.login(email, password);
    localStorage.setItem(api.TOKEN_KEY, result.token);
    persist({ user: result.user, permissions: result.permissions, modules: result.modules });
    if (!(result.modules || []).includes('messaging')) {
      clear();
      throw new Error('Tu cuenta no tiene el módulo de mensajería habilitado.');
    }
    return result;
  };

  const logout = () => clear();

  const hasPermission = (key) => permissions.includes(key);

  return (
    <AuthContext.Provider value={{ user, permissions, modules, login, logout, loading, hasPermission }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}
