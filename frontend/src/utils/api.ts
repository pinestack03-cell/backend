const API_BASE = import.meta.env.VITE_API_URL || 'http://103.119.56.74:90';

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
  docPath: (path: string) => path?.startsWith('http') ? path : `${API_BASE}${path}`,
};