import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/stores/authStore";

interface CreateSiteExpenseParams {
  siteId: string;
  category: "material" | "transport" | "food" | "general";
  amount: number;
  expenseDate: string;
  description?: string;
  workType?: string;
}

export function useCreateSiteExpense() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  return useMutation({
    mutationFn: async (params: CreateSiteExpenseParams) => {
      if (!user) {
        throw new Error("User not authenticated");
      }

      const { data, error } = await supabase
        .from("site_expenses")
        .insert({
          site_id: params.siteId,
          category: params.category,
          amount: params.amount,
          date: params.expenseDate,
          description: params.description || null,
          work_type: params.workType || null,
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
        queryKey: ["site-expenses", params.siteId],
      });
      queryClient.invalidateQueries({
        queryKey: ["site-pnl", params.siteId],
      });
    },
  });
}
