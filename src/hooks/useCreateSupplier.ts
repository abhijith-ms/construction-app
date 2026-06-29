import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export interface CreateSupplierData {
  name: string;
  contact_phone: string;
  contact_email: string;
  materials_supplied: string;
  is_active?: boolean;
}

export function useCreateSupplier() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateSupplierData) => {
      const { data: result, error } = await supabase
        .from("suppliers")
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
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
    },
  });
}
