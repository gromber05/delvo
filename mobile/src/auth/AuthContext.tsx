import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  api,
  setApiToken,
  setApiRefreshToken,
  setOnTokensRefreshed,
  setOnAuthExpired,
  UserDto,
} from '../api/client';
import { requestPermissionsAndRegisterToken } from '../notifications/NotificationService';

const TOKEN_KEY = 'delvo_token';
const REFRESH_TOKEN_KEY = 'delvo_refresh_token';
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

  
  const logout = useCallback(async () => {
    setApiToken(null);
    setApiRefreshToken(null);
    await AsyncStorage.multiRemove([TOKEN_KEY, REFRESH_TOKEN_KEY, USER_KEY]);
    setState({ token: null, user: null, loading: false });
  }, []);

  
  useEffect(() => {
    (async () => {
      try {
        const [[, savedToken], [, savedRefresh], [, userRaw]] = await AsyncStorage.multiGet([
          TOKEN_KEY,
          REFRESH_TOKEN_KEY,
          USER_KEY,
        ]);
        const savedUser = userRaw ? (JSON.parse(userRaw) as UserDto) : null;
        if (savedToken) setApiToken(savedToken);
        if (savedRefresh) setApiRefreshToken(savedRefresh);
        setState({ token: savedToken ?? null, user: savedUser, loading: false });

        if (savedToken) {
          try {
            const { user: freshUser } = await api.me();
            await AsyncStorage.setItem(USER_KEY, JSON.stringify(freshUser));
            setState((s) => ({ ...s, user: freshUser }));
          } catch {
          }
        }
      } catch {
        setState((s) => ({ ...s, loading: false }));
      }
    })();
  }, []);

  
  useEffect(() => {
    
    setOnTokensRefreshed((newAccess, newRefresh) => {
      AsyncStorage.multiSet([
        [TOKEN_KEY, newAccess],
        [REFRESH_TOKEN_KEY, newRefresh],
      ]).catch(() => {});
      setState((s) => ({ ...s, token: newAccess }));
    });

    
    setOnAuthExpired(() => {
      logout().catch(() => {});
    });

    return () => {
      setOnTokensRefreshed(null);
      setOnAuthExpired(null);
    };
  }, [logout]);

  
  const persist = useCallback(async (token: string, refreshToken: string, user: UserDto) => {
    setApiToken(token);
    setApiRefreshToken(refreshToken);
    await AsyncStorage.multiSet([
      [TOKEN_KEY, token],
      [REFRESH_TOKEN_KEY, refreshToken],
      [USER_KEY, JSON.stringify(user)],
    ]);
    setState({ token, user, loading: false });
    requestPermissionsAndRegisterToken().catch(() => {});
  }, []);

  
  const login = useCallback(
    async (email: string, password: string) => {
      const res = await api.login(email, password);
      await persist(res.access_token, res.refresh_token, res.user);
    },
    [persist],
  );

  const register = useCallback(
    async (name: string, email: string, password: string) => {
      const res = await api.register(name, email, password);
      await persist(res.access_token, res.refresh_token, res.user);
    },
    [persist],
  );

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
