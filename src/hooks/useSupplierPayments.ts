import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export interface SupplierPayment {
  id: string;
  bill_id: string;
  supplier_id: string;
  amount: number;
  payment_date: string;
  payment_mode: "cash" | "gpay" | "bank";
  notes: string | null;
  last_edited_by: string;
  last_edited_at: string;
  created_at: string;
  bill: {
    id: string;
    bill_number: string | null;
    bill_date: string;
    purchase_order: {
      id: string;
      description: string;
    } | null;
  } | null;
}

async function fetchSupplierPayments(supplierId: string): Promise<SupplierPayment[]> {
  const { data, error } = await supabase
    .from("supplier_payments")
    .select(
      `
      *,
      bill:bills!inner(
        id,
        bill_number,
        bill_date,
        purchase_orders!inner(
          id,
          description
        )
      )
    `
    )
    .eq("supplier_id", supplierId)
    .order("payment_date", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  // Transform the nested data
  return (data || []).map((item: any) => ({
    id: item.id,
    bill_id: item.bill_id,
    supplier_id: item.supplier_id,
    amount: item.amount,
    payment_date: item.payment_date,
    payment_mode: item.payment_mode,
    notes: item.notes,
    last_edited_by: item.last_edited_by,
    last_edited_at: item.last_edited_at,
    created_at: item.created_at,
    bill: item.bill
      ? {
          id: item.bill.id,
          bill_number: item.bill.bill_number,
          bill_date: item.bill.bill_date,
          purchase_order: item.bill.purchase_orders
            ? {
                id: item.bill.purchase_orders.id,
                description: item.bill.purchase_orders.description,
              }
            : null,
        }
      : null,
  }));
}

export function useSupplierPayments(supplierId: string) {
  return useQuery<SupplierPayment[]>({
    queryKey: ["supplier-payments", supplierId],
    queryFn: () => fetchSupplierPayments(supplierId),
    enabled: !!supplierId,
  });
}
