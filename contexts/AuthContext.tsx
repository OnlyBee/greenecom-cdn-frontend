import React, { createContext, useState, useEffect, ReactNode } from 'react';
import type { User } from '../types';
import { api } from '../services/api';

interface AuthContextType {
  user: User | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  loading: boolean;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Lấy user + accessToken từ localStorage khi load lại trang
  useEffect(() => {
    setLoading(true);
    try {
      const storedUser = localStorage.getItem('user');
      const token = localStorage.getItem('accessToken');

      if (storedUser && token) {
        setUser(JSON.parse(storedUser));
      }
    } catch (e) {
      // Nếu data localStorage lỗi → clear cho sạch
      localStorage.clear();
    } finally {
      setLoading(false);
    }
  }, []);

  // Login đúng flow gốc: gọi api.login → nó sẽ tự lưu accessToken
  const login = async (username: string, password: string) => {
    const loggedInUser = await api.login(username, password);
    setUser(loggedInUser);
    localStorage.setItem('user', JSON.stringify(loggedInUser));
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('user');
    localStorage.removeItem('accessToken');
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
