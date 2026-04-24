import { ApiClient } from "@/lib/api-client";

export interface EmailParticipant {
  email: string;
  display_name?: string;
  last_interaction?: string;
  message_count: number;
  is_contact: boolean;
  contact_id?: string;
}

export const emailsApi = {
  getParticipants: async (): Promise<EmailParticipant[]> => {
    return ApiClient.get("/emails/participants");
  },
  
  markAsRead: async (emailId: string): Promise<{ status: string }> => {
    return ApiClient.post(`/emails/${emailId}/read`, {});
  }
};
