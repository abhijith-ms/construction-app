import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/stores/authStore";

export interface CreateLabourAdvanceData {
  labour_id: string;
  site_id: string;
  amount: number;
  date_given: string;
  notes?: string;
}

export function useCreateLabourAdvance() {
  const queryClient = useQueryClient();
  const { profile } = useAuthStore();

  return useMutation({
    mutationFn: async (data: CreateLabourAdvanceData) => {
      if (!profile?.id) {
        throw new Error("User must be authenticated to create an advance");
      }

      const { data: result, error } = await supabase
        .from("labour_advances")
        .insert({
          ...data,
          last_edited_by: profile.id,
        })
        .select()
        .single();

      if (error) {
        throw new Error(error.message);
      }

      return result;
    },
    onSuccess: (_, variables) => {
      // Invalidate advances for this labour
      queryClient.invalidateQueries({
        queryKey: ["labour-advances", variables.labour_id],
      });
      // Invalidate settlements so payroll recalculates correctly
      queryClient.invalidateQueries({
        queryKey: ["settlements"],
      });
    },
  });
}
