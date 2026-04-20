import { ApiClient } from "@/lib/api-client";

export interface Contact {
  [x: string]: any;
  id: string; // UUID from backend
  name: string;
  email?: string;
  phone?: string;
  circle_id?: string; // UUID
  notes?: string;
  linkedin_url?: string;
  avatar?: string;
  last_contacted_at?: string;
  created_at?: string;
  provider?: string;
  /** True when an active non-group WhatsApp row exists for this person (linked or phone match). */
  has_whatsapp?: boolean;
  whatsapp_contact_id?: string;
  instagram_username?: string;
  is_group?: boolean;
}

export interface CreateCircleRequest {
  name: string;
  frequency: string;
  contact_ids?: string[];
  outreach_agenda?: string;
  channels?: string[];
}

export interface Circle {
  [x: string]: any;
  id: string; // UUID from backend
  name: string;
  frequency: string;
  channels?: string[];
  outreach_agenda?: string;
  contacts_count: number;
}

export interface ContactStats {
  total_contacts: number;
  platform_counts: Record<string, number>;
}

export interface ContactPage {
  items: Contact[];
  total: number;
  offset: number;
  limit: number;
  platform: string;
  timing_ms: number;
  timings_detail?: Record<string, number>;
  truncated: boolean;
  has_more: boolean;
  next_cursor?: string | null;
  cache_hit?: boolean;
  consistency?: Record<string, unknown> | null;
}

export interface CreateContactRequest {
  name: string;
  email?: string;
  phone?: string;
  circle_id?: string;
  notes?: string;
  linkedin_url?: string;
}

export const contactsApi = {
  getContacts: async (circleId?: string): Promise<Contact[]> => {
    const query = circleId ? `?circle_id=${circleId}` : '';
    return ApiClient.get(`/contacts/${query}`);
  },

  /** Paginated merged list with server-side platform filter; totals align with stats chips. */
  getContactsPage: async (params: {
    platform?: string;
    limit?: number;
    offset?: number;
    cursor?: string;
    circleId?: string;
    search?: string;
    validate?: boolean;
  }): Promise<ContactPage> => {
    const qs = new URLSearchParams();
    if (params.platform) qs.set('platform', params.platform);
    if (params.limit != null) qs.set('limit', String(params.limit));
    if (params.cursor) qs.set('cursor', params.cursor);
    else if (params.offset != null) qs.set('offset', String(params.offset));
    if (params.circleId) qs.set('circle_id', params.circleId);
    if (params.search) qs.set('search', params.search);
    if (params.validate) qs.set('validate', 'true');
    const q = qs.toString();
    return ApiClient.get(`/contacts/page${q ? `?${q}` : ''}`);
  },

  createContact: async (data: CreateContactRequest): Promise<Contact> => {
    return ApiClient.post("/contacts/", data);
  },

  updateContact: async (id: string, data: Partial<CreateContactRequest>): Promise<Contact> => {
    return ApiClient.put(`/contacts/${id}`, data);
  },

  deleteContact: async (id: string): Promise<{ message: string }> => {
    return ApiClient.delete(`/contacts/${id}`);
  },
  // Circles
  getCircles: async (): Promise<Circle[]> => {
    return ApiClient.get('/contacts/circles/');
  },

  createCircle: async (data: CreateCircleRequest): Promise<Circle> => {
    return ApiClient.post('/contacts/circles', data);
  },

  updateCircle: async (id: string, data: Partial<CreateCircleRequest>): Promise<Circle> => {
    return ApiClient.put(`/contacts/circles/${id}`, data);
  },

  deleteCircle: async (id: string): Promise<void> => {
    return ApiClient.delete(`/contacts/circles/${id}`);
  },

  getContactConversations: async (
    contactId: string,
    options?: { refresh?: boolean; limit?: number }
  ): Promise<{ success: boolean; conversations: any[] }> => {
    const params = new URLSearchParams();
    if (options?.refresh) params.set("refresh", "true");
    if (options?.limit) params.set("limit", String(options.limit));
    const query = params.toString();
    return ApiClient.get(
      `/contacts/${contactId}/conversations${query ? `?${query}` : ""}`
    );
  },

  getStats: async (): Promise<ContactStats> => {
    return ApiClient.get("/contacts/stats");
  },
};
