import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useInboxStore } from './inboxStore';

interface User {
  id: string;
  username: string;
  onboarding_step?: number;
  first_name?: string;
  last_name?: string;
  linkedin_url?: string;
  photo_url?: string;         // LinkedIn profile photo from EnrichLayer
  personal_profile?: string;
  email?: string;
  // AI prefs
  message_tone?: string;
  message_length?: string;
  birthday_reminders?: boolean;
  social_monitoring?: boolean;
  push_notifications?: boolean;
}

interface AuthState {
  accessToken: string | null;
  user: User | null;
  isAuthenticated: boolean;

  // Actions
  setAuth: (token: string, user: User) => void;
  setUser: (user: User) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      user: null,
      isAuthenticated: false,

      setAuth: (token, user) => set({
        accessToken: token,
        user: {
          ...user,
        },
        isAuthenticated: true
      }),

      setUser: (user) => set({ user }),

      logout: () => {
        // Clear other stores to prevent data leakage between users
        useInboxStore.getState().reset();

        set({
          accessToken: null,
          user: null,
          isAuthenticated: false
        });
      },
    }),
    {
      name: 'knudge-auth',
    }
  )
);
