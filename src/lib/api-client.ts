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

export class ApiClient {
  private static getHeaders(token?: string) {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    } else {
      const storedToken = useAuthStore.getState().accessToken;
      if (storedToken) {
        headers['Authorization'] = `Bearer ${storedToken}`;
      }
    }

    return headers;
  }

  static async get(endpoint: string, token?: string) {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'GET',
      headers: this.getHeaders(token),
    });
    return this.handleResponse(response);
  }

  static async post(endpoint: string, body: any, token?: string) {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: this.getHeaders(token),
      body: JSON.stringify(body),
    });
    return this.handleResponse(response);
  }

  static async put(endpoint: string, body: any, token?: string) {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'PUT',
      headers: this.getHeaders(token),
      body: JSON.stringify(body),
    });
    return this.handleResponse(response);
  }

  static async delete(endpoint: string, token?: string) {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'DELETE',
      headers: this.getHeaders(token),
    });
    return this.handleResponse(response);
  }

  static async patch(endpoint: string, body: any, token?: string) {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'PATCH',
      headers: this.getHeaders(token),
      body: JSON.stringify(body),
    });
    return this.handleResponse(response);
  }

  static async postForm(endpoint: string, formData: FormData, token?: string) {
    const headers: HeadersInit = {};

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    } else {
      const storedToken = useAuthStore.getState().accessToken;
      if (storedToken) {
        headers['Authorization'] = `Bearer ${storedToken}`;
      }
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers,
      body: formData,
    });
    return this.handleResponse(response);
  }

  private static async handleResponse(response: Response) {
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
      if (response.status === 401) {
        // Ensure we don't keep the UI in a broken authenticated state.
        try {
          useAuthStore.getState().logout();
        } catch {
          // ignore
        }
      }
      throw new Error(errorMessage);
    }

    return data;
  }
}
