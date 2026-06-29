import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/stores/authStore";
import { toast } from "sonner";

export interface UpdatePayReceiptData {
  id: string;
  site_id: string;
  date: string;
  amount: number;
  payment_mode: "cash" | "gpay" | "bank";
  notes?: string;
}

/**
 * Hook to update an existing pay receipt.
 * Updates last_edited_by and last_edited_at automatically.
 */
export function useUpdatePayReceipt() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  return useMutation({
    mutationFn: async (data: UpdatePayReceiptData) => {
      const { id, ...updateData } = data;
      const { data: result, error } = await supabase
        .from("pay_receipts")
        .update({
          ...updateData,
          last_edited_by: user?.id || "",
        })
        .eq("id", id)
        .select()
        .single();

      if (error) {
        throw new Error(error.message);
      }

      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payReceipts"] });
      toast.success("Pay receipt updated successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to update pay receipt");
    },
  });
}
