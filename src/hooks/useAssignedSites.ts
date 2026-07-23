import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/stores/authStore";
import type { Tables } from "@/types/database";

type Site = Tables<"sites">;

/**
 * Hook to fetch sites the current user has access to:
 * - Admin/Office Manager: all sites
 * - Supervisor: sites in site_access table
 */
export function useAssignedSites() {
  const { profile, user } = useAuthStore();

  const canManage = profile?.role === "admin" || profile?.role === "office_manager";

  const { data, isLoading, error } = useQuery({
    queryKey: ["assignedSites", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      if (canManage) {
        // Admin/Office Manager: fetch all sites
        const { data: sites, error: sitesError } = await supabase
          .from("sites")
          .select("*")
          .order("name");

        if (sitesError) throw sitesError;
        return sites as Site[];
      } else {
        // Supervisor: fetch sites via supervisor_site_assignments table
        const { data: siteAccess, error: accessError } = await supabase
          .from("supervisor_site_assignments")
          .select("site_id, sites(*)")
          .eq("supervisor_id", user.id);

        if (accessError) throw accessError;
        
        // Extract sites from the nested response
        return (siteAccess?.map((access) => access.sites) as Site[]) || [];
      }
    },
    // profile is not persisted across reloads (only user/isAuthenticated are —
    // see authStore.ts's partialize), so on a fresh page load user.id can be
    // truthy while profile is still null. canManage is computed from profile
    // and closed over in queryFn, so gating only on user.id let this query
    // fire and cache the wrong (supervisor) branch for an admin/office_manager
    // before their profile finished loading — and that wrong result then sat
    // cached for the default 5-minute staleTime. Waiting for profile too
    // ensures canManage is correct on the query's first real execution.
    enabled: !!user?.id && !!profile,
  });

  return { data: data ?? [], isLoading, error };
}
