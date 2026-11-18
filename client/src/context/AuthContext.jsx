import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('fitmanage_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [gym, setGym] = useState(() => {
    try {
      const saved = localStorage.getItem('fitmanage_gym');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [token, setToken] = useState(() => localStorage.getItem('fitmanage_token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadUser() {
      if (token) {
        try {
          const res = await api.getMe();
          setUser(res.user);
          setGym(res.gym);
          localStorage.setItem('fitmanage_user', JSON.stringify(res.user));
          localStorage.setItem('fitmanage_gym', JSON.stringify(res.gym));
        } catch (e) {
          console.error('Failed to restore session:', e);
          logout();
        }
      }
      setLoading(false);
    }
    loadUser();
  }, [token]);

  const login = async (email, password) => {
    const res = await api.login({ email, password });
    setToken(res.token);
    setUser(res.user);
    setGym(res.gym);
    localStorage.setItem('fitmanage_token', res.token);
    localStorage.setItem('fitmanage_user', JSON.stringify(res.user));
    localStorage.setItem('fitmanage_gym', JSON.stringify(res.gym));
    return res;
  };

  const register = async (details) => {
    const res = await api.register(details);
    setToken(res.token);
    setUser(res.user);
    setGym(res.gym);
    localStorage.setItem('fitmanage_token', res.token);
    localStorage.setItem('fitmanage_user', JSON.stringify(res.user));
    localStorage.setItem('fitmanage_gym', JSON.stringify(res.gym));
    return res;
  };

  const logout = () => {
    setUser(null);
    setGym(null);
    setToken(null);
    localStorage.removeItem('fitmanage_token');
    localStorage.removeItem('fitmanage_user');
    localStorage.removeItem('fitmanage_gym');
  };

  const updateGym = (newGym) => {
    setGym(newGym);
    localStorage.setItem('fitmanage_gym', JSON.stringify(newGym));
  };

  return (
    <AuthContext.Provider value={{ user, gym, token, loading, login, register, logout, updateGym }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
