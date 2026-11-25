import { createContext, ReactNode, useCallback, useContext, useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { get, post, setUnauthorizedHandler, tokenStore } from '../api/client';
import type { Me } from '../api/types';
import { setToday } from '../lib/format';

interface AuthApi {
  me: Me | null;
  ready: boolean;
  /** Owners log in with email or phone + PIN; staff with email + their 4-digit staff PIN. */
  login: (o: { id: string; password: string; remember: boolean; asStaff: boolean }) => Promise<void>;
  logout: () => void;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthApi | null>(null);
export const useAuth = () => {
  const c = useContext(AuthContext);
  if (!c) throw new Error('useAuth outside AuthProvider');
  return c;
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient();
  const [me, setMe] = useState<Me | null>(null);
  const [ready, setReady] = useState(false);

  const logout = useCallback(() => {
    tokenStore.clear();
    setMe(null);
    qc.clear();
  }, [qc]);

  const refresh = useCallback(async () => {
    const res = await get<{ data: Me }>('/business/me');
    setToday(res.data.today);
    setMe(res.data);
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(logout);
    if (!tokenStore.get()) {
      setReady(true);
      return;
    }
    refresh().catch(() => logout()).finally(() => setReady(true));
  }, [logout, refresh]);

  const login = useCallback(async ({ id, password, remember, asStaff }: { id: string; password: string; remember: boolean; asStaff: boolean }) => {
    const res = asStaff
      ? await post<{ access_token?: string; message?: string }>('/staff/login', { email: id, pin: password })
      : await post<{ access_token?: string; message?: string }>('/login', { phone: id, password });
    // Wrong details come back as 200 { status: true, message } with no token.
    if (!res.access_token) throw new Error(res.message || 'Those details did not match an account. Check them and try again.');
    tokenStore.set(res.access_token, remember);
    await refresh();
  }, [refresh]);

  return <AuthContext.Provider value={{ me, ready, login, logout, refresh }}>{children}</AuthContext.Provider>;
}
