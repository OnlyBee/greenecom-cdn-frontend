// src/contexts/AuthContext.tsx
import React, {
  createContext,
  useState,
  useEffect,
  ReactNode,
  useContext,
} from 'react';

type Role = 'ADMIN' | 'MEMBER' | string;

export type User = {
  id: string;
  username: string;
  role: Role;
};

type AuthContextType = {
  user: User | null;
  token: string | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_KEY = 'greenecom_token';
const USER_KEY = 'greenecom_user';

// Giải mã payload của JWT để lấy userId, role
type DecodedToken = {
  userId: string;
  role: Role;
  exp: number;
  iat: number;
};

function decodeToken(token: string): DecodedToken | null {
  try {
    const [, payload] = token.split('.');
    const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(json);
  } catch {
    return null;
  }
}

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);

  // Load lại từ localStorage khi F5
  useEffect(() => {
    const storedToken = localStorage.getItem(TOKEN_KEY);
    const storedUser = localStorage.getItem(USER_KEY);

    if (storedToken && storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser) as User;
        setToken(storedToken);
        setUser(parsedUser);
      } catch {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
      }
    }
  }, []);

  const login = async (username: string, password: string) => {
    const res = await fetch('/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });

    const data = await res.json().catch(() => ({} as any));

    if (!res.ok) {
      throw new Error(data?.message || 'Invalid username or password');
    }

    // Backend (server.js) trả về: { token, role, username }
    const tokenFromServer: string = data.token;
    if (!tokenFromServer) {
      throw new Error('No token returned from server');
    }

    const decoded = decodeToken(tokenFromServer);
    if (!decoded) {
      throw new Error('Invalid token');
    }

    const loggedUser: User = {
      id: decoded.userId,
      username: data.username || username,
      role: decoded.role || (data.role as Role),
    };

    setToken(tokenFromServer);
    setUser(loggedUser);

    localStorage.setItem(TOKEN_KEY, tokenFromServer);
    localStorage.setItem(USER_KEY, JSON.stringify(loggedUser));
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  };

  const value: AuthContextType = {
    user,
    token,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Hook dùng trong app
export const useAuthContext = (): AuthContextType => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return ctx;
};
