import { ApiClient } from '@/lib/api-client';

export interface UserProfileResearch {
    identity: string | null;
    tone: string | null;
    topics: string[];
    expertise: string[];
}

export interface ContactIntelligence {
    id: string;
    contact_id: string;
    job_title: string | null;
    company: string | null;
    industry: string | null;
    linkedin_summary: string | null;
    engagement_style: string | null;
    talking_points: string[];
    recent_news: string | null;
    researched_at: string;
}

export const researchApi = {
    /**
     * Research user's own profile during onboarding
     */
    researchUserProfile: async (linkedinUrl: string, name?: string): Promise<UserProfileResearch> => {
        return ApiClient.post('/research/user-profile', {
            linkedin_url: linkedinUrl,
            name: name,
        });
    },

    /**
     * Trigger research for a specific contact
     */
    researchContact: async (contactId: string): Promise<ContactIntelligence> => {
        return ApiClient.post(`/research/contact/${contactId}`, {});
    },

    /**
     * Get existing research for a contact
     */
    getContactIntelligence: async (contactId: string): Promise<ContactIntelligence | null> => {
        return ApiClient.get(`/research/contact/${contactId}`);
    },
};
