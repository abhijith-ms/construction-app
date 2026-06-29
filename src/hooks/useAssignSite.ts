import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { useAuthStore } from "@/stores/authStore";

interface AssignSiteData {
  supervisorId: string;
  siteId: string;
}

export function useAssignSite() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  return useMutation({
    mutationFn: async ({ supervisorId, siteId }: AssignSiteData) => {
      const { data, error } = await supabase
        .from("supervisor_site_assignments")
        .insert([
          {
            supervisor_id: supervisorId,
            site_id: siteId,
            assigned_by: user?.id || "",
          },
        ])
        .select()
        .single();

      if (error) {
        throw error;
      }

      return data;
    },
    onSuccess: () => {
      // Invalidate supervisors query to refresh assigned sites
      queryClient.invalidateQueries({ queryKey: ["supervisors"] });
      toast.success("Site assigned successfully");
    },
    onError: (error: { code?: string; message?: string }) => {
      // Handle duplicate assignment error (unique constraint violation)
      if (error.code === "23505") {
        toast.error("Supervisor is already assigned to this site");
      } else {
        toast.error(error.message || "Failed to assign site");
      }
    },
  });
}
