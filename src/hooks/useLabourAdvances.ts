import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { Tables } from "@/types/database";

type LabourAdvance = Tables<"labour_advances">;
type Site = Tables<"sites">;
type LabourSettlement = Tables<"labour_settlements">;

export interface LabourAdvanceWithDetails extends LabourAdvance {
  sites: Pick<Site, "id" | "name"> | null;
  labour_settlements: Pick<LabourSettlement, "id" | "week_start_date"> | null;
}

export function useLabourAdvances(labourId: string | null) {
  return useQuery({
    queryKey: ["labour-advances", labourId],
    queryFn: async (): Promise<LabourAdvanceWithDetails[]> => {
      if (!labourId) return [];

      const { data, error } = await supabase
        .from("labour_advances")
        .select(`
          *,
          sites!labour_advances_site_id_fkey (id, name),
          labour_settlements!labour_advances_settlement_id_fkey (id, week_start_date)
        `)
        .eq("labour_id", labourId)
        .order("date_given", { ascending: false });

      if (error) {
        throw new Error(error.message);
      }

      return (data as LabourAdvanceWithDetails[]) || [];
    },
    enabled: !!labourId,
  });
}
