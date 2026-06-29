import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/stores/authStore";

export interface CreateSupplierPaymentData {
  bill_id: string;
  supplier_id: string;
  amount: number;
  payment_date: string;
  payment_mode: "cash" | "gpay" | "bank";
  notes?: string;
}

export function useCreateSupplierPayment() {
  const queryClient = useQueryClient();
  const { profile } = useAuthStore();

  return useMutation({
    mutationFn: async (data: CreateSupplierPaymentData) => {
      if (!profile?.id) {
        throw new Error("User must be authenticated to create a payment");
      }

      const { data: result, error } = await supabase
        .from("supplier_payments")
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
      // Invalidate payments and supplier balance
      queryClient.invalidateQueries({
        queryKey: ["supplier-payments", variables.supplier_id],
      });
      queryClient.invalidateQueries({
        queryKey: ["supplier", variables.supplier_id],
      });
      // Also invalidate suppliers list as balance changes
      queryClient.invalidateQueries({
        queryKey: ["suppliers"],
      });
    },
  });
}
