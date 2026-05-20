import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api, setApiToken, UserDto } from '../api/client';

const TOKEN_KEY = 'delvo_token';
const USER_KEY = 'delvo_user';

interface AuthState {
  token: string | null;
  user: UserDto | null;
  loading: boolean;
}

interface AuthContextValue extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    token: null,
    user: null,
    loading: true,
  });

  // Restore session on mount
  useEffect(() => {
    (async () => {
      try {
        const [token, userRaw] = await AsyncStorage.multiGet([TOKEN_KEY, USER_KEY]);
        const savedToken = token[1];
        const savedUser = userRaw[1] ? (JSON.parse(userRaw[1]) as UserDto) : null;
        if (savedToken) setApiToken(savedToken);
        setState({ token: savedToken, user: savedUser, loading: false });
      } catch {
        setState((s) => ({ ...s, loading: false }));
      }
    })();
  }, []);

  const persist = useCallback(async (token: string, user: UserDto) => {
    setApiToken(token);
    await AsyncStorage.multiSet([
      [TOKEN_KEY, token],
      [USER_KEY, JSON.stringify(user)],
    ]);
    setState({ token, user, loading: false });
  }, []);

  const login = useCallback(
    async (email: string, password: string) => {
      const res = await api.login(email, password);
      await persist(res.access_token, res.user);
    },
    [persist],
  );

  const register = useCallback(
    async (name: string, email: string, password: string) => {
      const res = await api.register(name, email, password);
      await persist(res.access_token, res.user);
    },
    [persist],
  );

  const logout = useCallback(async () => {
    setApiToken(null);
    await AsyncStorage.multiRemove([TOKEN_KEY, USER_KEY]);
    setState({ token: null, user: null, loading: false });
  }, []);

  return (
    <AuthContext.Provider value={{ ...state, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
