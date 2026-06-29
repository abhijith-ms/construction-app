import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export interface SupplierBalance {
  supplier_id: string;
  name: string;
  contact_phone: string | null;
  contact_email: string | null;
  materials_supplied: string | null;
  is_active: boolean;
  total_billed: number;
  total_paid: number;
  balance_owed: number;
}

export function useSuppliers() {
  return useQuery<SupplierBalance[], Error>({
    queryKey: ["suppliers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("supplier_balances" as any)
        .select("*")
        .order("name");

      if (error) {
        throw new Error(error.message);
      }

      return (data as unknown as SupplierBalance[]) ?? [];
    },
  });
}
