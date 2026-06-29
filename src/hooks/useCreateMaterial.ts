import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export interface CreateMaterialData {
  name: string;
  unit: string;
  is_active?: boolean;
}

export function useCreateMaterial() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateMaterialData) => {
      const { data: result, error } = await supabase
        .from("materials")
        .insert({
          ...data,
          is_active: data.is_active ?? true,
        })
        .select()
        .single();

      if (error) {
        throw new Error(error.message);
      }

      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["materials"] });
    },
  });
}
