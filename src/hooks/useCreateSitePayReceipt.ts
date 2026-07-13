import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/stores/authStore";

interface CreateSitePayReceiptParams {
  siteId: string;
  amount: number;
  receiptDate: string;
  paymentMode: "cash" | "gpay" | "bank";
  clientName?: string;
  notes?: string;
}

export function useCreateSitePayReceipt() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  return useMutation({
    mutationFn: async (params: CreateSitePayReceiptParams) => {
      if (!user) {
        throw new Error("User not authenticated");
      }

      const { data, error } = await supabase
        .from("pay_receipts")
        .insert({
          site_id: params.siteId,
          amount: params.amount,
          date: params.receiptDate,
          payment_mode: params.paymentMode,
          notes: params.notes || null,
          last_edited_by: user.id,
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      return data;
    },
    onSuccess: (_, params) => {
      queryClient.invalidateQueries({
        queryKey: ["site-pay-receipts", params.siteId],
      });
      queryClient.invalidateQueries({
        queryKey: ["site-pnl", params.siteId],
      });
    },
  });
}
