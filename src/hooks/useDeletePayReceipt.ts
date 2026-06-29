import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

/**
 * Hook to delete a pay receipt.
 */
export function useDeletePayReceipt() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("pay_receipts").delete().eq("id", id);

      if (error) {
        throw new Error(error.message);
      }

      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payReceipts"] });
      toast.success("Pay receipt deleted successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to delete pay receipt");
    },
  });
}
