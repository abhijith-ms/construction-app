import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export interface PurchaseOrder {
  id: string;
  site_id: string;
  supplier_id: string;
  description: string;
  total_amount: number;
  status: "pending" | "approved" | "received" | "cancelled";
  order_date: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  // Joined from sites table
  site?: {
    name: string;
  };
}

export function usePurchaseOrders(supplierId: string) {
  return useQuery<PurchaseOrder[], Error>({
    queryKey: ["purchase_orders", supplierId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("purchase_orders")
        .select(`
          *,
          site:sites(name)
        `)
        .eq("supplier_id", supplierId)
        .order("order_date", { ascending: false });

      if (error) {
        throw new Error(error.message);
      }

      return (data as unknown as PurchaseOrder[]) ?? [];
    },
    enabled: !!supplierId,
  });
}
