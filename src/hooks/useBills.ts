import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export interface Bill {
  id: string;
  purchase_order_id: string;
  bill_number: string | null;
  bill_date: string;
  amount: number;
  notes: string | null;
  last_edited_by: string;
  last_edited_at: string;
  created_at: string;
}

async function fetchBills(purchaseOrderId: string): Promise<Bill[]> {
  const { data, error } = await supabase
    .from("bills")
    .select("*")
    .eq("purchase_order_id", purchaseOrderId)
    .order("bill_date", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return data || [];
}

export function useBills(purchaseOrderId: string) {
  return useQuery<Bill[]>({
    queryKey: ["bills", purchaseOrderId],
    queryFn: () => fetchBills(purchaseOrderId),
    enabled: !!purchaseOrderId,
  });
}
