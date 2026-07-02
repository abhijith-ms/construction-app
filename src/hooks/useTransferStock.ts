import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export interface TransferStockData {
  from_site_id: string;
  to_site_id: string;
  material_id: string;
  quantity: number;
  reference_note?: string;
}

export function useTransferStock() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: TransferStockData) => {
      // supabase.rpc types are auto-generated and don't include
      // transfer_stock_between_sites yet (types predate migration 031).
      // Cast to any to bypass the generated type check until `supabase gen types`
      // is run to regenerate database.ts. The function exists and works in the DB.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any).rpc("transfer_stock_between_sites", {
        p_from_site_id: data.from_site_id,
        p_to_site_id: data.to_site_id,
        p_material_id: data.material_id,
        p_quantity: data.quantity,
        p_reference_note: data.reference_note || null,
        p_edited_by: null, // function resolves via auth.uid() internally
      });

      if (error) {
        throw new Error(error.message);
      }
    },
    onSuccess: () => {
      // Both stock_levels and stock_transactions must be invalidated —
      // the transfer inserts two rows and updates two stock_levels entries.
      queryClient.invalidateQueries({ queryKey: ["stockLevels"] });
      queryClient.invalidateQueries({ queryKey: ["stockTransactions"] });
    },
  });
}
