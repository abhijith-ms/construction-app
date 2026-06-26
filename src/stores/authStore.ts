import { create } from "zustand";
import { persist } from "zustand/middleware";
import { supabase } from "@/lib/supabase";
import { queryClient } from "@/main";
import type { Tables } from "@/types/database";

type Profile = Tables<"profiles">;

type UserState = {
  id: string;
  email: string;
};

interface AuthState {
  user: UserState | null;
  profile: Profile | null;
  loading: boolean;
  isAuthenticated: boolean;

  // Actions
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  fetchProfile: (userId: string) => Promise<void>;
  setLoading: (loading: boolean) => void;
  initialize: () => Promise<void>;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      profile: null,
      loading: true,
      isAuthenticated: false,

      signIn: async (email: string, password: string) => {
        set({ loading: true });
        try {
          const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
          });

          if (error) {
            return { error };
          }

          const userState: UserState = {
            id: data.user.id,
            email: data.user.email!,
          };

          set({ user: userState, isAuthenticated: true });
          
          // Fetch profile after successful login
          await get().fetchProfile(data.user.id);
          
          return { error: null };
        } finally {
          set({ loading: false });
        }
      },

      signOut: async () => {
        set({ loading: true });
        try {
          await supabase.auth.signOut();
          set({ user: null, profile: null, isAuthenticated: false });
        } finally {
          set({ loading: false });
        }
      },

      fetchProfile: async (userId: string) => {
        const { data, error } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", userId)
          .single();

        if (error) {
          console.error("Error fetching profile:", error);
          return;
        }

        set({ profile: data });
      },

      setLoading: (loading: boolean) => set({ loading }),

      initialize: async () => {
        set({ loading: true });
        try {
          // Check for existing session
          const { data: { session } } = await supabase.auth.getSession();
          
          if (session?.user) {
            const userState: UserState = {
              id: session.user.id,
              email: session.user.email!,
            };
            set({ user: userState, isAuthenticated: true });
            await get().fetchProfile(session.user.id);
          }

          // Subscribe to auth state changes to clear cache on user change
          supabase.auth.onAuthStateChange((event) => {
            if (event === 'SIGNED_OUT') {
              // Clear all cached queries when user signs out
              queryClient.clear();
            } else if (event === 'SIGNED_IN') {
              // Clear cached data when a different user signs in
              // This prevents showing previous user's data
              queryClient.clear();
            }
          });
        } finally {
          set({ loading: false });
        }
      },

      clearAuth: () => {
        set({ user: null, profile: null, isAuthenticated: false, loading: false });
      },
    }),
    {
      name: "auth-storage",
      partialize: (state) => ({ 
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);