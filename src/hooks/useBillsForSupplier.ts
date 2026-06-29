import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export interface BillForSupplier {
  id: string;
  purchase_order_id: string;
  bill_number: string | null;
  bill_date: string;
  amount: number;
  purchase_order: {
    id: string;
    description: string;
  } | null;
}

async function fetchBillsForSupplier(supplierId: string): Promise<BillForSupplier[]> {
  const { data, error } = await supabase
    .from("bills")
    .select(
      `
      id,
      purchase_order_id,
      bill_number,
      bill_date,
      amount,
      purchase_orders!inner(
        id,
        description
      )
    `
    )
    .eq("purchase_orders.supplier_id", supplierId)
    .order("bill_date", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  // Transform the nested data to match our interface
  return (data || []).map((item: any) => ({
    id: item.id,
    purchase_order_id: item.purchase_order_id,
    bill_number: item.bill_number,
    bill_date: item.bill_date,
    amount: item.amount,
    purchase_order: item.purchase_orders
      ? {
          id: item.purchase_orders.id,
          description: item.purchase_orders.description,
        }
      : null,
  }));
}

export function useBillsForSupplier(supplierId: string) {
  return useQuery<BillForSupplier[]>({
    queryKey: ["bills-for-supplier", supplierId],
    queryFn: () => fetchBillsForSupplier(supplierId),
    enabled: !!supplierId,
  });
}
