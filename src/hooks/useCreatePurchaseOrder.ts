import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/stores/authStore";

export interface CreatePurchaseOrderData {
  site_id: string;
  supplier_id: string;
  description: string;
  total_amount: number | null;
  order_date?: string;
  status?: "pending" | "approved" | "received" | "cancelled";
}

export function useCreatePurchaseOrder() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  return useMutation({
    mutationFn: async (data: CreatePurchaseOrderData) => {
      if (!user?.id) {
        throw new Error("User not authenticated");
      }

      const { data: result, error } = await supabase
        .from("purchase_orders")
        .insert({
          site_id: data.site_id,
          supplier_id: data.supplier_id,
          description: data.description,
          total_amount: data.total_amount,
          order_date: data.order_date ?? new Date().toISOString().split("T")[0],
          status: data.status ?? "pending",
          created_by: user.id,
        })
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
