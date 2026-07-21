import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/stores/authStore";

interface UpdateSitePhaseParams {
  siteId: string;
  phase: string;
  percentComplete: number;
}

export function useUpdateSitePhase() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  return useMutation({
    mutationFn: async ({ siteId, phase, percentComplete }: UpdateSitePhaseParams) => {
      if (!user) {
        throw new Error("User not authenticated");
      }

      const { data, error } = await supabase
        .from("site_phases")
        .update({
          percent_complete: percentComplete,
          last_edited_by: user.id,
          last_edited_at: new Date().toISOString(),
        })
        .eq("site_id", siteId)
        .eq("phase", phase)
        .select()
        .single();

      if (error) throw error;

      return data;
    },
    onSuccess: (_, params) => {
      queryClient.invalidateQueries({ queryKey: ["site-phases", params.siteId] });
    },
  });
}
