import { ApiClient } from "@/lib/api-client";

export interface DeckItem {
  id: string;
  status: string;
  ui_title: string;
  ui_subtitle: string;
  platform: string;
  content_payload: {
    draft_text?: string;
    [key: string]: any;
  };
  created_at?: string;
}

export const deckApi = {
  getDeck: async (): Promise<DeckItem[]> => {
    return ApiClient.get("/deck");
  },

  swipe: async (itemId: string, action: 'EXECUTE' | 'SNOOZE' | 'EDIT', contentPayload?: any) => {
    return ApiClient.post(`/deck/${itemId}/swipe`, {
      action,
      content_payload: contentPayload
    });
  },
};
