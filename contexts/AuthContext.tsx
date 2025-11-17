import React, {
  createContext,
  useState,
  useContext,
  ReactNode,
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
  const [token, setToken] = useState<string | null>(null);

  const login = async (username: string, password: string) => {
    // *** QUAN TRỌNG: GỌI ĐÚNG API BACKEND ***
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

    // Giả sử backend trả về { token: '...' }
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

// Hook tiện cho phía ngoài (anh đang dùng useAuth.ts để wrap lại)
export const useAuthContext = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return ctx;
};
