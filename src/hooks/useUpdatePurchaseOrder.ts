import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export interface UpdatePurchaseOrderData {
  id: string;
  site_id?: string;
  description?: string;
  total_amount?: number | null;
  order_date?: string;
  status?: "pending" | "approved" | "received" | "cancelled";
}

export function useUpdatePurchaseOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: UpdatePurchaseOrderData) => {
      const { id, ...updates } = data;

      const { data: result, error } = await supabase
        .from("purchase_orders")
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
      queryClient.invalidateQueries({ queryKey: ["purchase_orders"] });
    },
  });
}
