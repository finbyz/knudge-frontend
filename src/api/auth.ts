import { ApiClient } from "@/lib/api-client";

export interface LoginRequest {
  username: string; // Can be username or email
  password: string;
}

export interface SignupRequest {
  username: string;
  email: string;
  password: string;
}

// Basic token response from login/signup
export interface TokenResponse {
  access_token: string;
  token_type: string;
  user_id: string;
  username: string;
  synapse_user_id?: string;
}

// Detailed user profile response
export interface UserResponse {
  id: string;
  username: string;
  email: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  linkedin_url?: string;
  personal_profile?: string;
  synapse_user_id?: string;
  onboarding_step?: number;
  birthday_reminders?: boolean;
  social_monitoring?: boolean;
  push_notifications?: boolean;
  message_tone?: string;       // 'casual' | 'professional' | 'friendly'
  message_length?: string;     // 'short' | 'medium' | 'long'
}

export interface UserUpdate {
  first_name?: string;
  last_name?: string;
  phone?: string;
  linkedin_url?: string;
  personal_profile?: string;
  onboarding_step?: number;
  birthday_reminders?: boolean;
  social_monitoring?: boolean;
  push_notifications?: boolean;
  message_tone?: string;       // 'casual' | 'professional' | 'friendly'
  message_length?: string;     // 'short' | 'medium' | 'long'
}

export const authApi = {
  login: async (data: LoginRequest): Promise<TokenResponse> => {
    // URLSearchParams for form-urlencoded vs JSON depending on backend expectation.
    // Based on endpoints/auth.py, it expects JSON body for LoginRequest
    return ApiClient.post('/auth/login', data);
  },

  signup: async (data: SignupRequest): Promise<TokenResponse> => {
    return ApiClient.post('/auth/signup', data);
  },

  getMe: async (): Promise<UserResponse> => {
    return ApiClient.get('/auth/me');
  },

  updateMe: async (data: UserUpdate): Promise<UserResponse> => {
    return ApiClient.put('/auth/me', data);
  },
};
