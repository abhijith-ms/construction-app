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
  // Runtime-only: stores the unsubscribe fn for the auth listener so we never register it twice
  _authListener: (() => void) | null;

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
      // loading starts false so that persisted isAuthenticated:true does not show
      // the spinner on every page reload before initialize() resolves.
      loading: false,
      isAuthenticated: false,
      _authListener: null,

      signIn: async (email: string, password: string) => {
        set({ loading: true });
        try {
          const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
          });

          if (error) {
            console.error("Supabase signIn error:", error);
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
        } catch (error) {
          console.error("SignIn caught exception:", error);
          return { error: error instanceof Error ? error : new Error(String(error)) };
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
        // Guard: do not register a second listener if already initialized.
        // React 19 Strict Mode double-invokes effects, which would otherwise
        // stack two onAuthStateChange listeners and double-fire queryClient.clear().
        if (get()._authListener) return;

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

          // Subscribe to auth state changes.
          // Store the unsubscribe handle so we can clean up and avoid duplicates.
          // IMPORTANT: SIGNED_IN is intentionally not handled here.
          // Supabase fires SIGNED_IN on every silent JWT refresh (~hourly and on
          // tab focus), so putting queryClient.clear() there was nuking all
          // TanStack Query caches during normal navigation and causing the
          // route re-render stall.
          const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
            if (event === 'SIGNED_OUT') {
              queryClient.clear();
            }
          });
          set({ _authListener: subscription.unsubscribe.bind(subscription) });
        } finally {
          set({ loading: false });
        }
      },

      clearAuth: () => {
        const unsub = get()._authListener;
        if (unsub) unsub();
        set({ user: null, profile: null, isAuthenticated: false, loading: false, _authListener: null });
      },
    }),
    {
      name: "auth-storage",
      partialize: (state) => ({ 
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        // loading and _authListener are intentionally excluded — they are runtime-only
      }),
    }
  )
);