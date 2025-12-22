import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
  id: string;
  username: string;
  synapse_user_id?: string;
  onboarding_step?: number;
  first_name?: string;
  last_name?: string;
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
        user, 
        isAuthenticated: true 
      }),

      setUser: (user) => set({ user }),

      logout: () => set({ 
        accessToken: null, 
        user: null, 
        isAuthenticated: false 
      }),
    }),
    {
      name: 'knudge-auth',
    }
  )
);
