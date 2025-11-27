
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
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
};

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_KEY = 'greenecom_token';
const USER_KEY = 'greenecom_user';

type DecodedToken = {
  id: string;
  role: Role;
  username?: string;
  exp: number;
  iat: number;
};

function decodeToken(token: string): DecodedToken | null {
  if (!token || typeof token !== 'string') return null;
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    
    const payload = parts[1];
    if (!payload) return null;

    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const json = atob(base64);
    return JSON.parse(json);
  } catch (e) {
    console.error("Failed to decode token", e);
    return null;
  }
}

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    try {
        const storedToken = localStorage.getItem(TOKEN_KEY);

        if (storedToken) {
          const decoded = decodeToken(storedToken);
          
          if (decoded && decoded.id && decoded.exp * 1000 > Date.now()) {
            setToken(storedToken);
            
            let username = decoded.username || 'User';
            try {
                const oldUserStorage = localStorage.getItem(USER_KEY);
                if (oldUserStorage) {
                    const parsed = JSON.parse(oldUserStorage);
                    if (parsed.username) username = parsed.username;
                }
            } catch (e) {
                console.warn("Failed to parse user storage", e);
            }

            const restoredUser: User = {
                id: decoded.id,
                role: decoded.role,
                username: username
            };

            setUser(restoredUser);
            localStorage.setItem(USER_KEY, JSON.stringify(restoredUser));
          } else {
            // Token invalid or expired
            localStorage.removeItem(TOKEN_KEY);
            localStorage.removeItem(USER_KEY);
            setToken(null);
            setUser(null);
          }
        }
    } catch (e) {
        console.error("Auth initialization error", e);
        localStorage.clear();
    } finally {
        setLoading(false);
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
      throw new Error('Invalid token received');
    }

    const loggedUser: User = {
      id: decoded.id,
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
    loading,
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
