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
      // 1. Insert the rate/category assignment (primary operation).
      const { data, error } = await (supabase as any)
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

      // 2. Sync site_labour_assignments roster: ensure the worker is active on
      //    this site's attendance list.
      //
      //    We cannot use .upsert(onConflict) because the unique constraint on
      //    site_labour_assignments is a PARTIAL index (WHERE is_active = true),
      //    which Postgres cannot use as an upsert conflict target. Instead we
      //    SELECT the most recent row for this (site, labour) pair, then either
      //    UPDATE it to is_active=true or INSERT a new row.
      const { data: existingRoster, error: rosterSelectError } = await supabase
        .from("site_labour_assignments")
        .select("id, is_active")
        .eq("site_id", input.site_id)
        .eq("labour_id", input.labour_id)
        .order("assigned_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (rosterSelectError) throw rosterSelectError;

      if (existingRoster) {
        if (!existingRoster.is_active) {
          // Re-activate an existing inactive roster row.
          const { error: rosterUpdateError } = await supabase
            .from("site_labour_assignments")
            .update({
              is_active: true,
              last_edited_by: input.assigned_by,
              last_edited_at: new Date().toISOString(),
            })
            .eq("id", existingRoster.id);

          if (rosterUpdateError) throw rosterUpdateError;
        }
        // else: already active — no action needed.
      } else {
        // No roster row exists at all — insert a fresh one.
        const { error: rosterInsertError } = await supabase
          .from("site_labour_assignments")
          .insert({
            site_id: input.site_id,
            labour_id: input.labour_id,
            is_active: true,
            assigned_by: input.assigned_by,
            last_edited_by: input.assigned_by,
          });

        if (rosterInsertError) throw rosterInsertError;
      }

      return data;
    },
    onSuccess: (_, input) => {
      queryClient.invalidateQueries({ queryKey: ["labour_site_assignments", input.labour_id] });
      queryClient.invalidateQueries({ queryKey: ["active_site_assignments", input.site_id] });
      // Refresh Labour Pool badge and site roster list.
      queryClient.invalidateQueries({ queryKey: ["labour-pool"] });
      queryClient.invalidateQueries({ queryKey: ["site-workers", input.site_id] });
    },
  });
}
