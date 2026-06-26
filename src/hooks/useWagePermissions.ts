import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/stores/authStore";

/**
 * Hook to check if the current supervisor has wage visibility permission
 * Queries the supervisor_wage_permissions table
 * Returns true if supervisor has can_view_set_wages = true for any site
 * Admin/Office Manager always returns true
 */
export function useWagePermissions() {
  const { profile, user } = useAuthStore();

  const isSupervisor = profile?.role === "supervisor";
  const canManage = profile?.role === "admin" || profile?.role === "office_manager";

  const { data, isLoading } = useQuery({
    queryKey: ["wagePermissions", user?.id],
    queryFn: async () => {
      // Admin/Office Manager always have wage visibility (no DB check needed)
      if (!isSupervisor || !user?.id) {
        return true;
      }

      // Query supervisor_wage_permissions for any site with can_view_set_wages = true
      const { data, error } = await supabase
        .from("supervisor_wage_permissions")
        .select("can_view_set_wages")
        .eq("supervisor_id", user.id)
        .eq("can_view_set_wages", true)
        .maybeSingle();

      if (error) {
        // Default to false on error for security
        return false;
      }

      // Has permission if any record found with can_view_set_wages = true
      return data !== null;
    },
    // Only enable query for supervisors
    enabled: isSupervisor && !!user?.id,
    // Don't refetch unnecessarily - permissions change rarely
    staleTime: 5 * 60 * 1000,
  });

  // For admin/office_manager, always return true
  // For supervisors, return the permission check result
  // While loading, default to false (hide rates) for security
  return {
    canViewWages: canManage ? true : (isSupervisor ? data ?? false : false),
    isLoading,
    isSupervisor,
    canManage,
  };
}
