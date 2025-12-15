import { ApiClient } from "@/lib/api-client";

export interface PlatformStatus {
  connected: boolean;
  contact_count: number;
}

export interface BridgeStatus {
  whatsapp: PlatformStatus;
  signal: PlatformStatus;
  linkedin: PlatformStatus;
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

  getGmailStatus: async (): Promise<{ is_connected: boolean, email?: string }> => {
    return ApiClient.get('/gmail/status');
  },

  exchangeGmailCode: async (code: string): Promise<any> => {
    return ApiClient.post('/gmail/callback', { code });
  },

  disconnectGmail: async (): Promise<{ status: string }> => {
    return ApiClient.post('/gmail/disconnect', {});
  },

  // Outlook Extensions
  getOutlookAuthUrl: async (): Promise<{ url: string }> => {
    return ApiClient.get('/outlook/auth_url');
  },

  getOutlookStatus: async (): Promise<{ is_connected: boolean, email?: string }> => {
    return ApiClient.get('/outlook/status');
  },

  exchangeOutlookCode: async (code: string): Promise<any> => {
    return ApiClient.post('/outlook/callback', { code });
  },

  disconnectOutlook: async (): Promise<{ status: string }> => {
    return ApiClient.post('/outlook/disconnect', {});
  }
};
