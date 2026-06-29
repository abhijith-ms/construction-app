import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export interface CreateStockTransactionData {
  site_id: string;
  material_id: string;
  transaction_type: "receipt" | "usage";
  quantity: number;
  reference_note?: string;
}

export function useCreateStockTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateStockTransactionData) => {
      // Get current user ID for audit
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error("Not authenticated");
      }

      const { data: result, error } = await supabase
        .from("stock_transactions")
        .insert([
          {
            site_id: data.site_id,
            material_id: data.material_id,
            transaction_type: data.transaction_type,
            quantity: data.quantity,
            reference_note: data.reference_note || null,
            last_edited_by: session.user.id,
          },
        ])
        .select()
        .single();

      if (error) {
        throw new Error(error.message);
      }

      return result;
    },
    onSuccess: () => {
      // Invalidate BOTH stock_transactions AND stock_levels queries
      // so the Stock Levels tab updates automatically
      queryClient.invalidateQueries({ queryKey: ["stockTransactions"] });
      queryClient.invalidateQueries({ queryKey: ["stockLevels"] });
    },
  });
}
