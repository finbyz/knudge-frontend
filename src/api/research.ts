import { ApiClient } from '@/lib/api-client';

// Rich profile research result from EnrichLayer + OpenAI
export interface UserResearchProfile {
    id: string;
    photo_url: string | null;
    headline: string | null;       // e.g. "Software Developer at FinByz"
    location: string | null;
    follower_count: number | null;
    connections: number | null;
    short_summary: string | null;  // has [[highlight]] markers
    full_bio: string | null;       // 300-400 word biography
    identity: string | null;       // "Tech Entrepreneur"
    tone: string | null;           // "Direct & Data-Driven"
    topics: string[];
    talking_points: string[];
    researched_at: string;
    // Legacy aliases
    expertise: string[];
}

// Contact intelligence (unchanged)
export interface ContactIntelligence {
    id: string;
    contact_id: string;
    job_title?: string;
    company?: string;
    industry?: string;
    linkedin_summary?: string;
    engagement_style?: string;
    talking_points?: string[];
    recent_news?: string;
    researched_at: string;
}

export const researchApi = {
    /**
     * Research the logged-in user's own LinkedIn profile (EnrichLayer + OpenAI).
     */
    researchUserProfile: async (
        linkedinUrl?: string,
        name?: string,
        options?: {
            firstName?: string;
            lastName?: string;
            company?: string;
            jobTitle?: string;
            websiteUrl?: string;
        }
    ): Promise<UserResearchProfile> => {
        return ApiClient.post('/research/user-profile/', {
            linkedin_url: linkedinUrl,
            name: name,
            first_name: options?.firstName,
            last_name: options?.lastName,
            company: options?.company,
            job_title: options?.jobTitle,
            website_url: options?.websiteUrl,
        });
    },

    /**
     * Get existing research profile (no re-fetch).
     */
    getUserResearchProfile: async (): Promise<UserResearchProfile | null> => {
        try {
            return await ApiClient.get('/research/user-profile/');
        } catch {
            return null;
        }
    },

    /**
     * Research a contact (uses Perplexity separately — unchanged).
     */
    researchContact: async (contactId: string): Promise<ContactIntelligence> => {
        return ApiClient.post(`/research/contact/${contactId}/`, {});
    },

    /**
     * Get existing intelligence for a contact.
     */
    getContactIntelligence: async (contactId: string): Promise<ContactIntelligence | null> => {
        try {
            return await ApiClient.get(`/research/contact/${contactId}/`);
        } catch {
            return null;
        }
    },
};
