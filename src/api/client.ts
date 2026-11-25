// Thin fetch wrapper for the Dara API (Laravel + Sanctum bearer tokens).

export const API_URL = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '') || 'https://base.usedara.com/api/v1';

const TOKEN_KEY = 'dara.business.token';

/** "Remember me" keeps the token in localStorage, otherwise only for this tab. */
export const tokenStore = {
  get(): string | null {
    try {
      return localStorage.getItem(TOKEN_KEY) ?? sessionStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  },
  set(token: string, remember: boolean) {
    try {
      (remember ? localStorage : sessionStorage).setItem(TOKEN_KEY, token);
      (remember ? sessionStorage : localStorage).removeItem(TOKEN_KEY);
    } catch {
      /* storage blocked: the session lasts until reload */
      memoryToken = token;
    }
  },
  clear() {
    memoryToken = null;
    try {
      localStorage.removeItem(TOKEN_KEY);
      sessionStorage.removeItem(TOKEN_KEY);
    } catch {
      /* ignore */
    }
  },
};
let memoryToken: string | null = null;

export class ApiError extends Error {
  constructor(message: string, public status: number, public errors?: Record<string, string[]>) {
    super(message);
  }
}

let onUnauthorized: (() => void) | null = null;
export const setUnauthorizedHandler = (fn: () => void) => {
  onUnauthorized = fn;
};

type Body = Record<string, unknown> | FormData | undefined;

export async function api<T = any>(method: string, path: string, body?: Body): Promise<T> {
  const token = tokenStore.get() ?? memoryToken;
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (token) headers.Authorization = 'Bearer ' + token;
  if (body && !(body instanceof FormData)) headers['Content-Type'] = 'application/json';

  let res: Response;
  try {
    res = await fetch(API_URL + path, {
      method,
      headers,
      body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError('Could not reach Dara. Check your internet connection and try again.', 0);
  }

  const data = await res.json().catch(() => ({}));

  if (res.status === 401) {
    onUnauthorized?.();
    throw new ApiError(data.message || 'Your session has ended. Please log in again.', 401);
  }
  // Some older endpoints answer 200 with { status: false }.
  if (!res.ok || data.status === false || data.success === false) {
    const errors = data.errors as Record<string, string[]> | undefined;
    const first = errors ? Object.values(errors)[0]?.[0] : undefined;
    throw new ApiError(first || data.message || 'Something went wrong. Please try again.', res.status, errors);
  }

  return data as T;
}

export const get = <T = any>(path: string) => api<T>('GET', path);
export const post = <T = any>(path: string, body?: Body) => api<T>('POST', path, body);
export const put = <T = any>(path: string, body?: Body) => api<T>('PUT', path, body);
export const patch = <T = any>(path: string, body?: Body) => api<T>('PATCH', path, body);
export const del = <T = any>(path: string) => api<T>('DELETE', path);
