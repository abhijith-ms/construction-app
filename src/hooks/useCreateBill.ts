import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/stores/authStore";

export interface CreateBillData {
  purchase_order_id: string;
  bill_number?: string;
  bill_date: string;
  amount: number;
  notes?: string;
}

export function useCreateBill() {
  const queryClient = useQueryClient();
  const { profile } = useAuthStore();

  return useMutation({
    mutationFn: async (data: CreateBillData) => {
      if (!profile?.id) {
        throw new Error("User must be authenticated to create a bill");
      }

      const { data: result, error } = await supabase
        .from("bills")
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
      // Invalidate bills for this purchase order
      queryClient.invalidateQueries({
        queryKey: ["bills", variables.purchase_order_id],
      });
    },
  });
}
