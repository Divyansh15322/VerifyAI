import React, { createContext, useState, useEffect, useContext } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Attempt auto-login with existing token
    const token = localStorage.getItem('verifyai_token');
    if (token) {
      api.get('/auth/me')
        .then((res) => {
          setUser(res.data);
          localStorage.setItem('verifyai_user', JSON.stringify(res.data));
        })
        .catch(() => {
          // Token expired or invalid
          localStorage.removeItem('verifyai_token');
          localStorage.removeItem('verifyai_user');
          setUser(null);
        })
        .finally(() => {
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    const { access_token, user: userData } = res.data;
    
    localStorage.setItem('verifyai_token', access_token);
    localStorage.setItem('verifyai_user', JSON.stringify(userData));
    setUser(userData);
    return userData;
  };

  const register = async (email, password, fullName) => {
    const res = await api.post('/auth/register', { email, password, full_name: fullName });
    return res.data;
  };

  const logout = () => {
    localStorage.removeItem('verifyai_token');
    localStorage.removeItem('verifyai_user');
    setUser(null);
  };

  const value = {
    user,
    loading,
    login,
    register,
    logout,
    isAuthenticated: !!user,
    isAdmin: user?.role === 'admin'
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
