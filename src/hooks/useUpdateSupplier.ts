import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export interface UpdateSupplierData {
  id: string;
  name: string;
  contact_phone: string;
  contact_email: string;
  materials_supplied: string;
  is_active: boolean;
}

export function useUpdateSupplier() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: UpdateSupplierData) => {
      const { id, ...updates } = data;

      const { data: result, error } = await supabase
        .from("suppliers")
        .update(updates)
        .eq("id", id)
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
