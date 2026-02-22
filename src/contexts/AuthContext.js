import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import apiService from '../services/apiService';

const AuthContext = createContext(null);

const TOKEN_KEY = 'authToken';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY));
  const [loading, setLoading] = useState(true);

  const persistToken = useCallback((newToken) => {
    if (newToken) {
      localStorage.setItem(TOKEN_KEY, newToken);
      apiService.setAuthToken(newToken);
    } else {
      localStorage.removeItem(TOKEN_KEY);
      apiService.setAuthToken(null);
    }
    setToken(newToken);
  }, []);

  useEffect(() => {
    if (token) {
      apiService.setAuthToken(token);
      apiService.get('/auth/me')
        .then((res) => {
          if (res.success) setUser(res.data);
          else persistToken(null);
        })
        .catch(() => persistToken(null))
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const login = useCallback(async (email, password) => {
    const res = await apiService.post('/auth/login', { email, password });
    if (res.success) {
      persistToken(res.data.token);
      setUser(res.data.user);
      return res.data.user;
    }
    throw new Error(res.error || 'Login failed');
  }, [persistToken]);

  const register = useCallback(async (email, password, username) => {
    const payload = { email, password };
    if (username) payload.username = username;
    const res = await apiService.post('/auth/register', payload);
    if (res.success) {
      persistToken(res.data.token);
      setUser(res.data.user);
      return res.data.user;
    }
    throw new Error(res.error || 'Registration failed');
  }, [persistToken]);

  const logout = useCallback(() => {
    persistToken(null);
    setUser(null);
  }, [persistToken]);

  const value = { user, token, loading, login, register, logout, isAuthenticated: !!user };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}

export default AuthContext;
