import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export interface EndAssignmentInput {
  assignmentId: string;
  labourId: string;
  siteId: string;
  endDate: string;
}

export function useEndLabourSiteAssignment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ assignmentId, endDate }: EndAssignmentInput) => {
      const client = supabase as any;
      const { data, error } = await client
        .from("labour_site_assignments")
        .update({ end_date: endDate })
        .eq("id", assignmentId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, input) => {
      // Invalidate both the labour's assignments and site's active assignments
      queryClient.invalidateQueries({ queryKey: ["labour_site_assignments", input.labourId] });
      queryClient.invalidateQueries({ queryKey: ["active_site_assignments", input.siteId] });
    },
  });
}
