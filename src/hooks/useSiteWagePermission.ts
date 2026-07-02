import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/stores/authStore";

/**
 * Hook to check if the current user has wage visibility permission for a specific site
 * Queries the supervisor_wage_permissions table for the given site_id
 * Returns true if supervisor has can_view_set_wages = true for the specific site
 * Admin/Office Manager always returns true
 */
export function useSiteWagePermission(siteId: string | null) {
  const { profile, user } = useAuthStore();

  const isSupervisor = profile?.role === "supervisor";
  const canManage = profile?.role === "admin" || profile?.role === "office_manager";

  const { data, isLoading } = useQuery({
    queryKey: ["siteWagePermission", user?.id, siteId],
    queryFn: async () => {
      // Admin/Office Manager always have wage visibility (no DB check needed)
      if (!isSupervisor || !user?.id) {
        return true;
      }

      // No site selected - default to false for security
      if (!siteId) {
        return false;
      }

      // Query supervisor_wage_permissions for the specific site
      const { data, error } = await supabase
        .from("supervisor_wage_permissions")
        .select("can_view_set_wages")
        .eq("supervisor_id", user.id)
        .eq("site_id", siteId)
        .maybeSingle();

      if (error) {
        // Default to false on error for security
        return false;
      }

      // Has permission if record exists with can_view_set_wages = true
      return data?.can_view_set_wages ?? false;
    },
    // Only enable query for supervisors when site is selected
    enabled: isSupervisor && !!user?.id && !!siteId,
    // Don't refetch unnecessarily - permissions change rarely
    staleTime: 5 * 60 * 1000,
  });

  // For admin/office_manager, always return true
  // For supervisors, return the permission check result for the specific site
  // While loading, default to false (hide rates) for security
  return {
    canViewWages: canManage ? true : (isSupervisor ? data ?? false : false),
    isLoading,
    isSupervisor,
    canManage,
  };
}
