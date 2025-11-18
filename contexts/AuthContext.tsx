import React, {
  createContext,
  useState,
  useEffect,
  ReactNode,
  useContext,
} from 'react';

export type User = {
  id: string;
  username: string;
  role: 'ADMIN' | 'MEMBER';
};

type AuthContextType = {
  user: User | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  loading: boolean;
};

export const AuthContext = createContext<AuthContextType | undefined>(
  undefined
);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Lấy user + token từ localStorage khi load lại trang
  useEffect(() => {
    setLoading(true);
    try {
      const storedUser = localStorage.getItem('user');
      const storedToken =
        localStorage.getItem('accessToken') || localStorage.getItem('token');

      if (storedUser && storedToken) {
        setUser(JSON.parse(storedUser));
      }
    } catch (e) {
      console.error('Auth load error:', e);
      localStorage.clear();
    } finally {
      setLoading(false);
    }
  }, []);

  // LOGIN: gọi đúng /login, nhận { accessToken, user }
  const login = async (username: string, password: string) => {
    const res = await fetch('/api/login', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ username, password }),
});

      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username, password }),
    });

    if (!res.ok) {
      throw new Error('Invalid username or password');
    }

    const data = await res.json();

    // Lưu token dưới cả hai key cho chắc (accessToken & token)
    const token = data.accessToken || data.token;
    if (!token) throw new Error('No token returned from server');

    localStorage.setItem('accessToken', token);
    localStorage.setItem('token', token);

    if (data.user) {
      localStorage.setItem('user', JSON.stringify(data.user));
      setUser(data.user);
    } else {
      // fallback nếu backend chưa trả user (hiện tại có rồi)
      setUser(null);
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('user');
    localStorage.removeItem('accessToken');
    localStorage.removeItem('token');
  };

  const value: AuthContextType = {
    user,
    login,
    logout,
    loading,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

// Hook dùng trong useAuth.ts
export const useAuthContext = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return ctx;
};
