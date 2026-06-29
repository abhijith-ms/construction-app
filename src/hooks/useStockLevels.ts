import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export interface StockLevel {
  id: string;
  site_id: string;
  material_id: string;
  quantity_on_hand: number;
  updated_at: string;
  material_name: string;
  material_unit: string;
  site_name: string;
}

export function useStockLevels(siteId?: string | null) {
  return useQuery<StockLevel[], Error>({
    queryKey: ["stockLevels", siteId],
    queryFn: async () => {
      let query = supabase
        .from("stock_levels")
        .select(
          `
          id,
          site_id,
          material_id,
          quantity_on_hand,
          updated_at,
          materials!inner(name, unit),
          sites!inner(name)
        `
        )
        .order("materials(name)");

      if (siteId) {
        query = query.eq("site_id", siteId);
      }

      const { data, error } = await query;

      if (error) {
        throw new Error(error.message);
      }

      // Transform the nested data into a flat structure
      const stockLevels: StockLevel[] =
        data?.map((item: any) => ({
          id: item.id,
          site_id: item.site_id,
          material_id: item.material_id,
          quantity_on_hand: item.quantity_on_hand,
          updated_at: item.updated_at,
          material_name: item.materials?.name || "Unknown",
          material_unit: item.materials?.unit || "",
          site_name: item.sites?.name || "Unknown",
        })) || [];

      return stockLevels;
    },
  });
}
