import { supabase } from "@/lib/supabase";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { TablesInsert, Tables } from "@/types/database";

export type LabourInsert = TablesInsert<"labour">;
export type Labour = Tables<"labour">;

export function useCreateLabour() {
  const queryClient = useQueryClient();

  return useMutation<Labour, Error, LabourInsert>({
    mutationFn: async (labour: LabourInsert) => {
      const { data, error } = await supabase
        .from("labour")
        .insert(labour)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["labour"] });
    },
    onError: (error) => {
      toast.error("Failed to create labour", {
        description: error.message,
      });
    },
  });
}
