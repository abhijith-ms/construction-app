import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export interface EndAssignmentInput {
  assignmentId: string;
  labourId: string;
  siteId: string;
  endDate: string;
  actorId: string; // profile.id of the user performing the action (for last_edited_by)
}

export function useEndLabourSiteAssignment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ assignmentId, labourId, siteId, actorId, endDate }: EndAssignmentInput) => {
      // 1. Set end_date on the rate/category assignment (primary operation).
      const { data, error } = await (supabase as any)
        .from("labour_site_assignments")
        .update({ end_date: endDate })
        .eq("id", assignmentId)
        .select()
        .single();

      if (error) throw error;

      // 2. Sync site_labour_assignments roster: deactivate the worker's roster
      //    entry only if no other active rate assignment remains for this
      //    (labour, site) pair. There may be multiple rate assignments for the
      //    same worker+site with different date ranges.
      const { data: remaining, error: remainingError } = await supabase
        .from("labour_site_assignments")
        .select("id")
        .eq("labour_id", labourId)
        .eq("site_id", siteId)
        .is("end_date", null)
        .limit(1)
        .maybeSingle();

      if (remainingError) throw remainingError;

      if (!remaining) {
        // No other open-ended rate assignment for this site — remove from roster.
        const { error: rosterError } = await supabase
          .from("site_labour_assignments")
          .update({
            is_active: false,
            last_edited_by: actorId,
            last_edited_at: new Date().toISOString(),
          })
          .eq("site_id", siteId)
          .eq("labour_id", labourId)
          .eq("is_active", true);

        if (rosterError) throw rosterError;
      }

      return data;
    },
    onSuccess: (_, input) => {
      queryClient.invalidateQueries({ queryKey: ["labour_site_assignments", input.labourId] });
      queryClient.invalidateQueries({ queryKey: ["active_site_assignments", input.siteId] });
      // Refresh Labour Pool badge and site roster list.
      queryClient.invalidateQueries({ queryKey: ["labour-pool"] });
      queryClient.invalidateQueries({ queryKey: ["site-workers", input.siteId] });
    },
  });
}

