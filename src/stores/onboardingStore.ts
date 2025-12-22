import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { authApi } from '@/api/auth';
import { useAuthStore } from './authStore';

export type GoalType = 'grow_business' | 'build_brand' | 'stay_connected' | null;

interface OnboardingState {
  currentStep: number;
  goal: GoalType;
  profile: {
    linkedinUrl: string;
    websiteUrl: string;
    summary: string;
  };
  voice: {
    length: number;
    tone: number;
    emoji: number;
  };
  knowledge: {
    files: string[];
    productName: string;
    websiteUrl: string;
  };
  connections: string[];
  trial: {
    subscribed: boolean;
    inviteCode?: string;
  };
  completed: boolean;
  
  // Actions
  setStep: (step: number) => void;
  setGoal: (goal: GoalType) => void;
  setProfile: (profile: Partial<OnboardingState['profile']>) => void;
  setVoice: (voice: Partial<OnboardingState['voice']>) => void;
  setKnowledge: (knowledge: Partial<OnboardingState['knowledge']>) => void;
  addConnection: (platform: string) => void;
  setTrial: (trial: Partial<OnboardingState['trial']>) => void;
  completeOnboarding: () => void;
  reset: () => void;
  syncFromUser: (user: any) => void;
}

const initialState = {
  currentStep: 1,
  goal: null as GoalType,
  profile: {
    linkedinUrl: '',
    websiteUrl: '',
    summary: '',
  },
  voice: {
    length: 50,
    tone: 50,
    emoji: 33,
  },
  knowledge: {
    files: [],
    productName: '',
    websiteUrl: '',
  },
  connections: [],
  trial: {
    subscribed: false,
  },
  completed: false,
};

export const useOnboardingStore = create<OnboardingState>()(
  persist(
    (set) => ({
      ...initialState,
      
      setStep: (step) => {
        set({ currentStep: step });
        // Fire and forget update to backend if user is logged in
        const { user } = useAuthStore.getState();
        if (user) {
          authApi.updateMe({ onboarding_step: step })
            .then(() => console.log('Backend step updated:', step))
            .catch(err => console.error('Failed to update onboarding step:', err));
        } else {
          console.warn("User not found in authStore, skipping backend update for step:", step);
        }
      },

      syncFromUser: (user) => {
        if (user?.onboarding_step) {
          set({ currentStep: user.onboarding_step });
          // If the user's step indicates they are still onboarding, ensure completed is false
          // If step > 7, it means they completed it (step 8 is complete state)
          if (user.onboarding_step > 7) {
            set({ completed: true });
          } else {
            set({ completed: false });
          }
        }
      },
      
      setGoal: (goal) => set({ goal }),
      
      setProfile: (profile) => set((state) => ({
        profile: { ...state.profile, ...profile }
      })),
      
      setVoice: (voice) => set((state) => ({
        voice: { ...state.voice, ...voice }
      })),
      
      setKnowledge: (knowledge) => set((state) => ({
        knowledge: { ...state.knowledge, ...knowledge }
      })),
      
      addConnection: (platform) => set((state) => ({
        connections: state.connections.includes(platform) 
          ? state.connections 
          : [...state.connections, platform]
      })),
      
      setTrial: (trial) => set((state) => ({
        trial: { ...state.trial, ...trial }
      })),
      
      completeOnboarding: () => {
        set({ completed: true });
        const { user } = useAuthStore.getState();
        if (user) {
          authApi.updateMe({ onboarding_step: 8 }).catch(console.error);
        }
      },
      
      reset: () => set(initialState),
    }),
    {
      name: 'knudge-onboarding',
    }
  )
);
