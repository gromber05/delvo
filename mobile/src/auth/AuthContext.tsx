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

  // ── Clear all session data ─────────────────────────────────────────────────
  const logout = useCallback(async () => {
    setApiToken(null);
    setApiRefreshToken(null);
    await AsyncStorage.multiRemove([TOKEN_KEY, REFRESH_TOKEN_KEY, USER_KEY]);
    setState({ token: null, user: null, loading: false });
  }, []);

  // ── Restore session on mount ───────────────────────────────────────────────
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
      } catch {
        setState((s) => ({ ...s, loading: false }));
      }
    })();
  }, []);

  // ── Wire client callbacks ──────────────────────────────────────────────────
  useEffect(() => {
    // After a silent refresh succeeds, persist the new token pair
    setOnTokensRefreshed((newAccess, newRefresh) => {
      AsyncStorage.multiSet([
        [TOKEN_KEY, newAccess],
        [REFRESH_TOKEN_KEY, newRefresh],
      ]).catch(() => {});
      setState((s) => ({ ...s, token: newAccess }));
    });

    // When both access and refresh are exhausted → force logout
    setOnAuthExpired(() => {
      logout().catch(() => {});
    });

    return () => {
      setOnTokensRefreshed(null);
      setOnAuthExpired(null);
    };
  }, [logout]);

  // ── Persist tokens + user to AsyncStorage ──────────────────────────────────
  const persist = useCallback(async (token: string, refreshToken: string, user: UserDto) => {
    setApiToken(token);
    setApiRefreshToken(refreshToken);
    await AsyncStorage.multiSet([
      [TOKEN_KEY, token],
      [REFRESH_TOKEN_KEY, refreshToken],
      [USER_KEY, JSON.stringify(user)],
    ]);
    setState({ token, user, loading: false });
  }, []);

  // ── Auth actions ───────────────────────────────────────────────────────────
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
