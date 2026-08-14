export interface Session {
  role: 'admin' | 'candidate';
  name?: string;
  slNo?: number;
}

const TOKEN_KEY = 'globe1-token';

export function getToken(): string | null {
  return window.localStorage.getItem(TOKEN_KEY);
}

export function setSessionToken(token: string): void {
  window.localStorage.setItem(TOKEN_KEY, token);
}

export function clearSession(): void {
  window.localStorage.removeItem(TOKEN_KEY);
}

function decodePayload(token: string): Record<string, unknown> | null {
  try {
    const part = token.split('.')[1];
    const json = atob(part.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(json);
  } catch {
    return null;
  }
}

export function getSession(): Session | null {
  const token = getToken();
  if (!token) return null;
  const payload = decodePayload(token);
  if (!payload || typeof payload.exp !== 'number' || Date.now() >= payload.exp * 1000) {
    clearSession();
    return null;
  }
  const role = payload.role === 'candidate' ? 'candidate' : 'admin';
  return {
    role,
    name: typeof payload.name === 'string' ? payload.name : undefined,
    slNo: role === 'candidate' && payload.sub != null ? Number(payload.sub) : undefined,
  };
}
