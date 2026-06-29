import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { Tables } from "@/types/database";

export type PayReceipt = Tables<"pay_receipts"> & {
  sites: { name: string } | null;
};

interface UsePayReceiptsOptions {
  siteId?: string | null;
}

/**
 * Hook to fetch pay receipts with optional site filter.
 * Includes site name for display.
 */
export function usePayReceipts({ siteId }: UsePayReceiptsOptions = {}) {
  return useQuery({
    queryKey: ["payReceipts", siteId || "all"],
    queryFn: async (): Promise<PayReceipt[]> => {
      let query = supabase
        .from("pay_receipts")
        .select("*, sites:site_id(name)")
        .order("date", { ascending: false });

      if (siteId) {
        query = query.eq("site_id", siteId);
      }

      const { data, error } = await query;

      if (error) {
        throw new Error(error.message);
      }

      return data || [];
    },
  });
}
