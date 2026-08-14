import { clearSession, getToken } from './auth';

const API_BASE = import.meta.env.VITE_API_URL || 'https://resume-api.globe1.online';

export const API_URL = {
  base: API_BASE,
  resources: `${API_BASE}/api/resources`,
  resourcesLatest: `${API_BASE}/api/resources/latest`,
  resourcesNextEntry: `${API_BASE}/api/resources/next-entry`,
  resourcesUpload: `${API_BASE}/api/resources/upload`,
  resourcesSearch: `${API_BASE}/api/resources/search`,
  resourcesById: (id: number) => `${API_BASE}/api/resources/${id}`,
  checkPhone: (phone: string, slNo?: number) => {
    const url = new URL(`${API_BASE}/api/check-phone`);
    url.searchParams.set("phone", phone);
    if (slNo) url.searchParams.set("slNo", slNo.toString());
    return url.toString();
  },
  parseCV: `${API_BASE}/parse-cv`,
  departments: `${API_BASE}/api/departments`,
  adminLogin: `${API_BASE}/api/auth/admin/login`,
  googleAuth: `${API_BASE}/api/auth/google`,
  candidateMe: `${API_BASE}/api/candidate/me`,
  candidateCv: `${API_BASE}/api/candidate/cv`,
  docPath: (path: string) => path?.startsWith('http') ? path : `${API_BASE}${path}`,
  docUrl: (path: string, token?: string | null) => {
    const url = API_URL.docPath(path);
    if (!token) return url;
    const sep = url.includes('?') ? '&' : '?';
    return `${url}${sep}token=${encodeURIComponent(token)}`;
  },
};

type UnauthorizedListener = () => void;
let unauthorizedListener: UnauthorizedListener | null = null;

export function setUnauthorizedListener(listener: UnauthorizedListener | null) {
  unauthorizedListener = listener;
}

export async function apiFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const token = getToken();
  const headers = new Headers(options.headers);
  if (token) headers.set('Authorization', `Bearer ${token}`);
  const response = await fetch(url, { ...options, headers });
  if (response.status === 401) {
    clearSession();
    unauthorizedListener?.();
  }
  return response;
}
