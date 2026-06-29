import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { SupplierBalance } from "./useSuppliers";

export function useSingleSupplier(id: string) {
  return useQuery<SupplierBalance, Error>({
    queryKey: ["suppliers", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("supplier_balances" as any)
        .select("*")
        .filter("supplier_id", "eq", id)
        .single();

      if (error) {
        throw new Error(error.message);
      }

      return data as unknown as SupplierBalance;
    },
    enabled: !!id,
  });
}
