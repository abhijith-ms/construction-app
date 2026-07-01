import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export interface CreateAssignmentInput {
  labour_id: string;
  site_id: string;
  task_category: string;
  daily_rate: number;
  start_date: string;
  notes?: string;
  assigned_by: string;
}

export function useCreateLabourSiteAssignment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateAssignmentInput) => {
      const client = supabase as any;
      const { data, error } = await client
        .from("labour_site_assignments")
        .insert({
          labour_id: input.labour_id,
          site_id: input.site_id,
          task_category: input.task_category,
          daily_rate: input.daily_rate,
          start_date: input.start_date,
          notes: input.notes || null,
          assigned_by: input.assigned_by,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, input) => {
      // Invalidate both the labour's assignments and site's active assignments
      queryClient.invalidateQueries({ queryKey: ["labour_site_assignments", input.labour_id] });
      queryClient.invalidateQueries({ queryKey: ["active_site_assignments", input.site_id] });
    },
  });
}
