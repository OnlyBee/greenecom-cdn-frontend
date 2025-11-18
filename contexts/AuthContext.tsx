import React, {
  createContext,
  useState,
  useContext,
  ReactNode,
  useEffect,
} from 'react';

type AuthContextType = {
  token: string | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
};

export const AuthContext = createContext<AuthContextType | undefined>(
  undefined
);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  // Lấy token từ localStorage khi app khởi động
  const [token, setToken] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    try {
      return localStorage.getItem('authToken');
    } catch {
      return null;
    }
  });

  // Mỗi khi token thay đổi thì đồng bộ với localStorage
  useEffect(() => {
    try {
      if (token) {
        localStorage.setItem('authToken', token);
      } else {
        localStorage.removeItem('authToken');
      }
    } catch {
      // ignore lỗi localStorage (nếu browser chặn)
    }
  }, [token]);

  const login = async (username: string, password: string) => {
    // GỌI ĐÚNG API BACKEND
    const response = await fetch('/api/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username, password }),
    });

    if (!response.ok) {
      throw new Error('Invalid username or password');
    }

    const data = await response.json();

    // Backend trả về { token: '...' }
    setToken(data.token || null);
  };

  const logout = () => {
    setToken(null);
  };

  const value: AuthContextType = {
    token,
    login,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// Hook tiện cho phía ngoài (useAuth.ts đang wrap lại)
export const useAuthContext = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return ctx;
};
