import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/stores/authStore";
import { toast } from "sonner";

interface UpdateWagePermissionData {
  supervisorId: string;
  siteId: string;
  canViewSetWages: boolean;
}

/**
 * Hook to update wage visibility permission for a supervisor on a specific site.
 * Uses upsert (insert or update) with conflict resolution on (supervisor_id, site_id).
 * Admin and Office Manager can both use this.
 */
export function useUpdateWagePermission() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  return useMutation({
    mutationFn: async ({
      supervisorId,
      siteId,
      canViewSetWages,
    }: UpdateWagePermissionData) => {
      const { error } = await supabase
        .from("supervisor_wage_permissions")
        .upsert(
          {
            supervisor_id: supervisorId,
            site_id: siteId,
            can_view_set_wages: canViewSetWages,
            // last_edited_by is updated on every change
            last_edited_by: user?.id || "",
          },
          {
            onConflict: "supervisor_id, site_id",
          }
        );

      if (error) {
        throw new Error(error.message);
      }
    },
    onSuccess: () => {
      // Invalidate supervisors query to refresh wage permissions
      queryClient.invalidateQueries({ queryKey: ["supervisors"] });
      toast.success("Wage visibility updated");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to update wage visibility");
    },
  });
}
