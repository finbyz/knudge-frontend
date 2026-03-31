import { ApiClient } from "@/lib/api-client";

export interface PlatformStatus {
  connected: boolean;
  contact_count: number;
}

export interface BridgeStatus {
  whatsapp: PlatformStatus;
  gmail: PlatformStatus;
  outlook: PlatformStatus;
  erpnext: PlatformStatus;
  telegram: PlatformStatus;
  instagram: PlatformStatus;
}

export interface LoginResponse {
  status: string;
  qr_code?: string;
  pairing_code?: string;
  message?: string;
  login_id?: string;
  step_id?: string;
}

export interface SynapseContact {
  user_id: string;
  display_name?: string;
  avatar_url?: string;
}

export interface SyncResponse {
  synced_count: number;
  contacts: SynapseContact[];
}

export const bridgesApi = {
  // Check functionality status of bridges
  getStatus: async (): Promise<BridgeStatus> => {
    return ApiClient.get("/bridges/status");
  },

  // Initiate login/connection
  login: async (protocol: string, phone?: string, params?: any): Promise<LoginResponse> => {
    return ApiClient.post(`/bridges/${protocol}/login`, { phone, params });
  },

  // Wait for login step completion (after QR scan or pairing code entry)
  // Note: This call may take a while as it waits for user to scan/enter code
  waitForLoginStep: async (protocol: string, login_id: string, step_id: string): Promise<LoginResponse> => {
    return ApiClient.post(`/bridges/${protocol}/login/step`, { login_id, step_id });
  },

  // Logout
  logout: async (protocol: string): Promise<{ status: string, message: string }> => {
    return ApiClient.post(`/bridges/${protocol}/logout`, {});
  },

  // Sync contacts from bridge to DB
  sync: async (protocol: string): Promise<SyncResponse> => {
    return ApiClient.post(`/bridges/${protocol}/sync`, {});
  },

  // Get raw contacts from Synapse (optional, sync usually preferred)
  getContacts: async (protocol: string): Promise<SynapseContact[]> => {
    return ApiClient.get(`/bridges/${protocol}/contacts`);
  },

  // Gmail Extensions
  getGmailAuthUrl: async (): Promise<{ url: string }> => {
    return ApiClient.get('/gmail/auth_url');
  },

  getGmailStatus: async (): Promise<{ is_connected: boolean, email?: string, contact_count?: number }> => {
    return ApiClient.get('/gmail/status');
  },

  exchangeGmailCode: async (code: string, state?: string): Promise<any> => {
    return ApiClient.post('/gmail/callback', { code, state });
  },

  disconnectGmail: async (): Promise<{ status: string }> => {
    return ApiClient.post('/gmail/disconnect', {});
  },

  // Outlook Extensions
  getOutlookAuthUrl: async (): Promise<{ url: string }> => {
    return ApiClient.get('/outlook/auth_url');
  },

  getOutlookStatus: async (): Promise<{ is_connected: boolean, email?: string, contact_count?: number }> => {
    return ApiClient.get('/outlook/status');
  },

  exchangeOutlookCode: async (code: string): Promise<any> => {
    return ApiClient.post('/outlook/callback', { code });
  },

  disconnectOutlook: async (): Promise<{ status: string }> => {
    return ApiClient.post('/outlook/disconnect', {});
  },

  syncOutlookEmails: async (): Promise<{ status: string, message: string, inbox_synced: number, sent_synced: number }> => {
    return ApiClient.post('/outlook/sync', {});
  },

  // ERPNext Integration
  connectERPNext: async (api_key: string, api_secret: string, base_url: string): Promise<{ status: string, base_url: string, message: string }> => {
    return ApiClient.post('/erpnext/connect', { api_key, api_secret, base_url });
  },

  getERPNextStatus: async (): Promise<{ is_connected: boolean, base_url?: string, contact_count?: number }> => {
    return ApiClient.get('/erpnext/status');
  },

  getERPNextContacts: async (): Promise<Array<{ name: string, email: string, phone: string | null, company: string | null }>> => {
    return ApiClient.get('/erpnext/contacts');
  },

  syncERPNext: async (): Promise<{ synced_count: number, updated_count: number, skipped_count: number, total: number }> => {
    return ApiClient.post('/erpnext/sync', {});
  },

  disconnectERPNext: async (): Promise<{ status: string }> => {
    return ApiClient.post('/erpnext/disconnect', {});
  },

  // Telegram Integration
  getTelegramStatus: async (): Promise<{ connected: boolean; user?: any; error?: string; contact_count?: number }> => {
    return ApiClient.get('/telegram/status');
  },

  requestTelegramCode: async (phone: string): Promise<{ status: string, phone_code_hash?: string, message?: string }> => {
    return ApiClient.post('/telegram/login/request-code', { phone });
  },

  verifyTelegramCode: async (phone: string, code: string, phone_code_hash: string, password?: string): Promise<{ status: string, user?: any }> => {
    return ApiClient.post('/telegram/login/verify-code', { phone, code, phone_code_hash, password });
  },

  syncTelegram: async (): Promise<{ status: string, contacts_synced: number, messages_synced: number }> => {
    return ApiClient.post('/telegram/sync', {});
  },

  disconnectTelegram: async (): Promise<{ status: string }> => {
    return ApiClient.post('/telegram/disconnect', {});
  },

  // Instagram Integration
  getInstagramStatus: async (): Promise<{ is_connected: boolean, account_type?: 'business' | 'personal', username?: string, contact_count?: number }> => {
    return ApiClient.get('/instagram/status');
  },

  connectInstagramPersonal: async (username: string, password: string, verification_code?: string): Promise<{ status: string, message: string, requires_mfa?: boolean }> => {
    return ApiClient.post('/instagram/connect/personal', { username, password, verification_code });
  },

  getInstagramAuthUrl: async (): Promise<{ url: string }> => {
    return ApiClient.get('/instagram/auth_url');
  },

  disconnectInstagram: async (): Promise<{ status: string }> => {
    return ApiClient.post('/instagram/disconnect', {});
  },

  syncInstagram: async (): Promise<{ synced_count: number }> => {
    return ApiClient.post('/instagram/sync', {});
  }
};
