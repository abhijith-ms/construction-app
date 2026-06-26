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
    enabled: !!user?.id,
  });

  return { data: data ?? [], isLoading, error };
}
