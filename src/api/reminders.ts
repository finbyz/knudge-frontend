import { ApiClient } from "@/lib/api-client";

export interface ReminderData {
  id: string;
  contact_id: string | null;
  contact_name: string | null;
  remind_at: string;
  note: string | null;
  status: string;
  created_at: string;
}

export interface CreateReminderRequest {
  contact_id?: string;
  contact_name?: string;
  remind_at: string;
  note?: string;
}

export const remindersApi = {
  create: async (data: CreateReminderRequest): Promise<{ success: boolean; reminder: ReminderData }> => {
    return ApiClient.post("/reminders/", data);
  },

  list: async (statusFilter?: string, contactId?: string): Promise<{ success: boolean; reminders: ReminderData[] }> => {
    const params = new URLSearchParams();
    if (statusFilter) params.set("status_filter", statusFilter);
    if (contactId) params.set("contact_id", contactId);
    const query = params.toString();
    return ApiClient.get(`/reminders/${query ? `?${query}` : ""}`);
  },

  getPending: async (): Promise<{ success: boolean; reminders: ReminderData[] }> => {
    return ApiClient.get("/reminders/pending");
  },

  getNotifications: async (): Promise<{ success: boolean; reminders: ReminderData[] }> => {
    return ApiClient.get("/reminders/notifications");
  },

  dismiss: async (id: string): Promise<{ success: boolean }> => {
    return ApiClient.patch(`/reminders/${id}/dismiss`, {});
  },

  dismissAll: async (): Promise<{ success: boolean }> => {
    return ApiClient.patch("/reminders/dismiss-all", {});
  },

  delete: async (id: string): Promise<{ success: boolean }> => {
    return ApiClient.delete(`/reminders/${id}`);
  },
};
