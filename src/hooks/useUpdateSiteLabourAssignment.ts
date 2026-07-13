import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/stores/authStore";

interface UpdateAssignmentParams {
  assignmentId: string;
  siteId: string;
  isActive: boolean;
}

export function useUpdateSiteLabourAssignment() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  return useMutation({
    mutationFn: async (params: UpdateAssignmentParams) => {
      if (!user) {
        throw new Error("User not authenticated");
      }

      const { data, error } = await (supabase as any)
        .from("site_labour_assignments")
        .update({
          is_active: params.isActive,
          last_edited_by: user.id,
          last_edited_at: new Date().toISOString(),
        })
        .eq("id", params.assignmentId)
        .select()
        .single();

      if (error) {
        throw error;
      }

      return data;
    },
    onSuccess: (_, params) => {
      queryClient.invalidateQueries({
        queryKey: ["site-workers", params.siteId],
      });
      queryClient.invalidateQueries({
        queryKey: ["labour-pool"],
      });
    },
  });
}
