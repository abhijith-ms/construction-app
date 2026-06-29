import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export function useDeleteStockTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (transactionId: string) => {
      const { error } = await supabase
        .from("stock_transactions")
        .delete()
        .eq("id", transactionId);

      if (error) {
        throw new Error(error.message);
      }

      return { id: transactionId };
    },
    onSuccess: () => {
      // Invalidate BOTH stock_transactions AND stock_levels queries
      // so the Stock Levels tab updates automatically
      queryClient.invalidateQueries({ queryKey: ["stockTransactions"] });
      queryClient.invalidateQueries({ queryKey: ["stockLevels"] });
    },
  });
}
