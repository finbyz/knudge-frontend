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

}

export interface CreateCircleRequest {
  name: string;
  frequency: string;
  contact_ids?: string[];
  outreach_agenda?: string;
}

export interface Circle {
  [x: string]: any;
  id: string; // UUID from backend
  name: string;
  frequency: string;
}

export interface CreateContactRequest {
  name: string;
  email?: string;
  phone?: string;
  circle_id?: number;
  notes?: string;
  linkedin_url?: string;
}

export const contactsApi = {
  getContacts: async (circleId?: number): Promise<Contact[]> => {
    const query = circleId ? `?circle_id=${circleId}` : '';
    return ApiClient.get(`/contacts/${query}`);
  },

  createContact: async (data: CreateContactRequest): Promise<Contact> => {
    return ApiClient.post("/contacts/", data);
  },

  updateContact: async (id: number, data: Partial<CreateContactRequest>): Promise<Contact> => {
    return ApiClient.put(`/contacts/${id}`, data);
  },

  deleteContact: async (id: number): Promise<{ message: string }> => {
    return ApiClient.delete(`/contacts/${id}`);
  },
  // Circles
  getCircles: async (): Promise<Circle[]> => {
    return ApiClient.get('/contacts/circles');
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
};
