import axios from 'axios';
import { supabase } from './supabase';

// All business data goes through Express; the browser talks to Supabase only for auth.

/** Every failed request becomes one of these: the API's `{ error: { code, message, details } }`. */
export class ApiError extends Error {
  constructor({ status = 0, code = 'NETWORK', message = 'Could not reach the server', details } = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
    this.rule = details && !Array.isArray(details) ? details.rule : undefined;
  }
}

export const http = axios.create({ baseURL: import.meta.env.VITE_API_URL || '/api' });

http.interceptors.request.use(async (config) => {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

let onUnauthorized = () => {};

/** AuthProvider registers what happens when a refreshed token is still refused. */
export function setUnauthorizedHandler(fn) {
  onUnauthorized = fn;
}

async function toApiError(error) {
  const { response } = error;
  if (!response) return new ApiError();
  let body = response.data;
  // Blob downloads (PDF, CSV) carry their JSON error as a Blob.
  if (typeof Blob !== 'undefined' && body instanceof Blob) {
    try {
      body = JSON.parse(await body.text());
    } catch {
      body = null;
    }
  }
  const e = body && typeof body === 'object' ? body.error : null;
  if (e) return new ApiError({ status: response.status, ...e });
  if (response.status === 429) {
    return new ApiError({
      status: 429,
      code: 'RATE_LIMITED',
      message: 'Too many attempts. Wait a few minutes and try again.',
    });
  }
  return new ApiError({
    status: response.status,
    code: response.status >= 500 ? 'INTERNAL' : 'HTTP_ERROR',
    message: response.status >= 500 ? 'Something went wrong on the server' : `Request failed (${response.status})`,
  });
}

// On 401: refresh the session once and retry; if it is refused again, sign out.
http.interceptors.response.use(
  (res) => res,
  async (error) => {
    const { config, response } = error;
    if (response?.status === 401 && config && !config.skipAuthRefresh) {
      if (!config._retried) {
        config._retried = true;
        const { data, error: refreshError } = await supabase.auth.refreshSession();
        if (!refreshError && data.session) return http(config);
      }
      onUnauthorized();
    }
    throw await toApiError(error);
  },
);

// Drop empty filters so URLs stay clean and the API never sees `search=`.
export function cleanParams(params = {}) {
  return Object.fromEntries(
    Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== ''),
  );
}

const unwrap = (res) => ({ data: res.data?.data, meta: res.data?.meta });

export const api = {
  get: (url, params, config) => http.get(url, { ...config, params: cleanParams(params) }).then(unwrap),
  post: (url, body, config) => http.post(url, body ?? {}, config).then(unwrap),
  patch: (url, body, config) => http.patch(url, body, config).then(unwrap),
  put: (url, body, config) => http.put(url, body, config).then(unwrap),
  delete: (url, config) => http.delete(url, config).then(unwrap),
  blob: (url, params) =>
    http.get(url, { params: cleanParams(params), responseType: 'blob' }).then((r) => r.data),
};

/** Opens a PDF (or other blob) from the API in a new tab. */
export async function openBlob(url, params) {
  // Open the tab synchronously so pop-up blockers treat it as user-initiated.
  const tab = window.open('', '_blank');
  try {
    const blob = await api.blob(url, params);
    const href = URL.createObjectURL(blob);
    if (tab) tab.location.href = href;
    else window.location.href = href;
    setTimeout(() => URL.revokeObjectURL(href), 60_000);
  } catch (err) {
    tab?.close();
    throw err;
  }
}

/** Downloads a blob from the API with the given file name. */
export async function downloadBlob(url, params, fileName) {
  const blob = await api.blob(url, params);
  const href = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = href;
  a.download = fileName;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(href), 10_000);
}
