import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export interface StockTransaction {
  id: string;
  site_id: string;
  material_id: string;
  transaction_type: "receipt" | "usage" | "transfer_in" | "transfer_out";
  quantity: number;
  reference_note: string | null;
  transfer_site_id: string | null;
  last_edited_by: string;
  last_edited_at: string;
  created_at: string;
  material_name: string;
  material_unit: string;
  site_name: string;
}

export function useStockTransactions(siteId?: string | null) {
  return useQuery<StockTransaction[], Error>({
    queryKey: ["stockTransactions", siteId],
    queryFn: async () => {
      let query = supabase
        .from("stock_transactions")
        .select(
          `
          id,
          site_id,
          material_id,
          transaction_type,
          quantity,
          reference_note,
          transfer_site_id,
          last_edited_by,
          last_edited_at,
          created_at,
          materials!inner(name, unit),
          sites!inner(name)
        `
        )
        .order("created_at", { ascending: false });

      if (siteId) {
        query = query.eq("site_id", siteId);
      }

      const { data, error } = await query;

      if (error) {
        throw new Error(error.message);
      }

      // Transform the nested data into a flat structure
      const transactions: StockTransaction[] =
        data?.map((item: any) => ({
          id: item.id,
          site_id: item.site_id,
          material_id: item.material_id,
          transaction_type: item.transaction_type,
          quantity: item.quantity,
          reference_note: item.reference_note,
          transfer_site_id: item.transfer_site_id,
          last_edited_by: item.last_edited_by,
          last_edited_at: item.last_edited_at,
          created_at: item.created_at,
          material_name: item.materials?.name || "Unknown",
          material_unit: item.materials?.unit || "",
          site_name: item.sites?.name || "Unknown",
        })) || [];

      return transactions;
    },
  });
}
