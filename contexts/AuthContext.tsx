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

export type AuthContextType = {
  user: User | null;
  token: string | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
};

// 👈 QUAN TRỌNG: export AuthContext để những chỗ cũ import { AuthContext } không bị lỗi
export const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_KEY = 'greenecom_token';
const USER_KEY = 'greenecom_user';

type DecodedToken = {
  id: string;
  role: Role;
  username?: string; // Backend có gửi kèm username trong token
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
    // Chúng ta không tin tưởng hoàn toàn vào storedUser vì nó có thể là format cũ (userId thay vì id)
    // const storedUser = localStorage.getItem(USER_KEY); 

    if (storedToken) {
      const decoded = decodeToken(storedToken);
      
      // Kiểm tra token còn hạn và có id hợp lệ không
      if (decoded && decoded.id && decoded.exp * 1000 > Date.now()) {
        setToken(storedToken);
        
        // Tái tạo object User từ token để đảm bảo luôn có 'id'
        // (Lấy username từ localStorage cũ nếu token không có, để hiển thị cho đẹp)
        let username = decoded.username || 'User';
        try {
             const oldUserStorage = JSON.parse(localStorage.getItem(USER_KEY) || '{}');
             if (oldUserStorage.username) username = oldUserStorage.username;
        } catch {}

        const restoredUser: User = {
            id: decoded.id,
            role: decoded.role,
            username: username
        };

        setUser(restoredUser);
        // Cập nhật lại localStorage cho đúng chuẩn mới
        localStorage.setItem(USER_KEY, JSON.stringify(restoredUser));
      } else {
        // Token lỗi hoặc hết hạn -> Logout
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
        setToken(null);
        setUser(null);
      }
    }
  }, []);

  const login = async (username: string, password: string) => {
    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });

    const data = await res.json().catch(() => ({} as any));

    if (!res.ok) {
      throw new Error(data?.message || 'Invalid username or password');
    }

    const tokenFromServer: string = data.token;
    if (!tokenFromServer) {
      throw new Error('No token returned from server');
    }

    const decoded = decodeToken(tokenFromServer);
    if (!decoded) {
      throw new Error('Invalid token');
    }

    const loggedUser: User = {
      id: decoded.id, // Đã sửa: lấy đúng field id
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

export const useAuthContext = (): AuthContextType => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return ctx;
};
