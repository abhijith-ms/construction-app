import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/stores/authStore";
import { toast } from "sonner";

export interface CreatePayReceiptData {
  site_id: string;
  date: string;
  amount: number;
  payment_mode: "cash" | "gpay" | "bank";
  notes?: string;
}

/**
 * Hook to create a new pay receipt.
 * Sets last_edited_by to current user automatically.
 */
export function useCreatePayReceipt() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  return useMutation({
    mutationFn: async (data: CreatePayReceiptData) => {
      const { data: result, error } = await supabase
        .from("pay_receipts")
        .insert({
          ...data,
          last_edited_by: user?.id || "",
        })
        .select()
        .single();

      if (error) {
        throw new Error(error.message);
      }

      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payReceipts"] });
      toast.success("Pay receipt added successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to add pay receipt");
    },
  });
}
