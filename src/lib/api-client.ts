const envApiUrl = import.meta.env.VITE_API_URL;
const envApiBasePath = import.meta.env.VITE_API_BASE_PATH || '/api/v1';

let baseUrl = envApiUrl || '';

// Never ship a build that points browsers at *their own* localhost.
// If the app is running on a real hostname and VITE_API_URL is localhost/127.0.0.1,
// ignore it and use same-origin relative URLs instead.
try {
  const host = window.location.hostname;
  const isLocalHost =
    host === 'localhost' || host === '127.0.0.1' || host.endsWith('.local');
  const looksLikeLocalApi =
    baseUrl.includes('127.0.0.1') || baseUrl.includes('localhost');
  if (!isLocalHost && looksLikeLocalApi) {
    baseUrl = '';
  }
} catch {
  // SSR / non-browser: keep envApiUrl as-is
}

if (baseUrl && !baseUrl.startsWith('http')) {
  baseUrl = `https://${baseUrl}`;
}

if (baseUrl) {
  // Remove trailing slash from baseUrl
  baseUrl = baseUrl.replace(/\/$/, '');
}

// Ensure basePath starts with slash
const path = envApiBasePath.startsWith('/') ? envApiBasePath : `/${envApiBasePath}`;

export const API_BASE_URL = `${baseUrl}${path}`;
// Base host URL without the /api/v1 path prefix — use this for media proxy URLs
// since the backend already returns full paths like /api/v1/whatsapp/media/{id}
export const API_HOST_URL = baseUrl;

import { useAuthStore } from "@/stores/authStore";

const AUTH_PERSIST_KEY = "knudge-auth";

/**
 * Read JWT from zustand-persist storage before rehydration completes.
 * Without this, first paint has accessToken=null and APIs send no Authorization header.
 */
export function getPersistedAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(AUTH_PERSIST_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { state?: { accessToken?: string | null } };
    const t = parsed?.state?.accessToken;
    return typeof t === "string" && t.length > 0 ? t : null;
  } catch {
    return null;
  }
}

/** Token from store (if hydrated) or from persisted localStorage. */
export function getEffectiveAccessToken(explicit?: string | null): string | null {
  if (explicit) return explicit;
  const fromStore = useAuthStore.getState().accessToken;
  if (fromStore) return fromStore;
  return getPersistedAccessToken();
}

export class ApiClient {
  /**
   * Minimal structured error so callers can decide whether to logout.
   * Never attach tokens or sensitive payloads here.
   */
  static ApiError = class ApiError extends Error {
    status: number;
    endpoint: string;
    data: unknown;
    constructor(message: string, status: number, endpoint: string, data: unknown) {
      super(message);
      this.name = "ApiError";
      this.status = status;
      this.endpoint = endpoint;
      this.data = data;
    }
  };

  private static getHeaders(token?: string) {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    const auth = getEffectiveAccessToken(token ?? null);
    if (auth) {
      headers['Authorization'] = `Bearer ${auth}`;
    }

    return headers;
  }

  static async get(endpoint: string, token?: string) {
    // Temporary debug visibility (do not log token value).
    if (endpoint.startsWith('/contacts') || endpoint.startsWith('/bridges/status')) {
      // eslint-disable-next-line no-console
      console.log(
        `[ApiClient] GET ${endpoint} hasToken=${!!getEffectiveAccessToken(token ?? null)}`
      );
    }
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'GET',
      headers: this.getHeaders(token),
    });
    return this.handleResponse(endpoint, response);
  }

  static async post(endpoint: string, body: any, token?: string) {
    if (endpoint.startsWith('/contacts') || endpoint.startsWith('/bridges/status')) {
      // eslint-disable-next-line no-console
      console.log(`[ApiClient] POST ${endpoint} hasToken=${!!(token || useAuthStore.getState().accessToken)}`);
    }
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: this.getHeaders(token),
      body: JSON.stringify(body),
    });
    return this.handleResponse(endpoint, response);
  }

  static async put(endpoint: string, body: any, token?: string) {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'PUT',
      headers: this.getHeaders(token),
      body: JSON.stringify(body),
    });
    return this.handleResponse(endpoint, response);
  }

  static async delete(endpoint: string, token?: string) {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'DELETE',
      headers: this.getHeaders(token),
    });
    return this.handleResponse(endpoint, response);
  }

  static async patch(endpoint: string, body: any, token?: string) {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'PATCH',
      headers: this.getHeaders(token),
      body: JSON.stringify(body),
    });
    return this.handleResponse(endpoint, response);
  }

  static async postForm(endpoint: string, formData: FormData, token?: string) {
    const headers: HeadersInit = {};
    const auth = getEffectiveAccessToken(token ?? null);
    if (auth) {
      headers['Authorization'] = `Bearer ${auth}`;
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers,
      body: formData,
    });
    return this.handleResponse(endpoint, response);
  }

  private static async handleResponse(endpoint: string, response: Response) {
    const contentType = response.headers.get("content-type");
    let data;

    if (contentType && contentType.indexOf("application/json") !== -1) {
      data = await response.json();
    } else {
      data = await response.text();
    }

    if (!response.ok) {
      const errorMessage = typeof data.detail === 'object'
        ? JSON.stringify(data.detail)
        : (data.detail || data.message || 'API request failed');
      // Do NOT blindly logout on every 401. Let ProtectedRoute decide based on /auth/me.
      throw new this.ApiError(errorMessage, response.status, endpoint, data);
    }

    return data;
  }
}
