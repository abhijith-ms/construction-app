import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { TablesInsert } from "@/types/database";

export function useCreateSite() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (siteData: TablesInsert<"sites">) => {
      const { data, error } = await supabase
        .from("sites")
        .insert([siteData])
        .select()
        .single();

      if (error) {
        throw new Error(error.message);
      }

      return data;
    },
    onSuccess: () => {
      // Invalidate and refetch sites query
      queryClient.invalidateQueries({ queryKey: ["sites"] });
    },
  });
}