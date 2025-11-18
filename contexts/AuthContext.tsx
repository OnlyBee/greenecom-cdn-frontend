// src/contexts/AuthContext.tsx
import React, {
  createContext,
  useState,
  useContext,
  ReactNode,
  useEffect,
} from 'react';

type AuthContextType = {
  token: string | null;
  username: string | null;
  role: string | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
};

export const AuthContext = createContext<AuthContextType | undefined>(
  undefined
);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);

  // Lấy token từ localStorage khi load lại trang
  useEffect(() => {
    const storedToken = localStorage.getItem('greenecom_token');
    const storedUser = localStorage.getItem('greenecom_username');
    const storedRole = localStorage.getItem('greenecom_role');

    if (storedToken) setToken(storedToken);
    if (storedUser) setUsername(storedUser);
    if (storedRole) setRole(storedRole);
  }, []);

  const login = async (usernameInput: string, password: string) => {
    // *** QUAN TRỌNG: gọi đúng /api/login ***
    const response = await fetch('/api/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: usernameInput,
        password,
      }),
    });

    if (!response.ok) {
      throw new Error('Invalid username or password');
    }

    const data = await response.json();
    // backend trả: { token, role, username }

    setToken(data.token || null);
    setUsername(data.username || usernameInput);
    setRole(data.role || null);

    // Lưu vào localStorage để reload vẫn giữ login
    localStorage.setItem('greenecom_token', data.token);
    localStorage.setItem('greenecom_username', data.username || usernameInput);
    if (data.role) localStorage.setItem('greenecom_role', data.role);
  };

  const logout = () => {
    setToken(null);
    setUsername(null);
    setRole(null);
    localStorage.removeItem('greenecom_token');
    localStorage.removeItem('greenecom_username');
    localStorage.removeItem('greenecom_role');
  };

  const value: AuthContextType = {
    token,
    username,
    role,
    login,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuthContext = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return ctx;
};
