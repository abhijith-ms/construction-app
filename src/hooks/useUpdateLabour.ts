import { supabase } from "@/lib/supabase";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { TablesUpdate, Tables } from "@/types/database";

export type LabourUpdate = TablesUpdate<"labour">;
export type Labour = Tables<"labour">;

export function useUpdateLabour() {
  const queryClient = useQueryClient();

  return useMutation<Labour, Error, { id: string; updates: LabourUpdate }>({
    mutationFn: async ({ id, updates }: { id: string; updates: LabourUpdate }) => {
      const { data, error } = await supabase
        .from("labour")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["labour"] });
    },
    onError: (error) => {
      toast.error("Failed to update labour", {
        description: error.message,
      });
    },
  });
}

export function useDeactivateLabour() {
  const queryClient = useQueryClient();

  return useMutation<Labour, Error, string>({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from("labour")
        .update({ is_active: false })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["labour"] });
      toast.success("Labour deactivated successfully");
    },
    onError: (error) => {
      toast.error("Failed to deactivate labour", {
        description: error.message,
      });
    },
  });
}
