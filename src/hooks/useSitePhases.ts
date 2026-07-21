import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { Tables } from "@/types/database";

export type SitePhase = Tables<"site_phases">;

export const PHASE_ORDER = ["foundation", "structure", "mep", "finishing", "handover"] as const;
export type PhaseName = (typeof PHASE_ORDER)[number];

export const PHASE_LABELS: Record<PhaseName, string> = {
  foundation: "Foundation",
  structure: "Structure",
  mep: "MEP",
  finishing: "Finishing",
  handover: "Handover",
};

export function useSitePhases(siteId: string | null) {
  return useQuery({
    queryKey: ["site-phases", siteId],
    queryFn: async (): Promise<SitePhase[]> => {
      if (!siteId) return [];

      const { data, error } = await supabase
        .from("site_phases")
        .select("*")
        .eq("site_id", siteId);

      if (error) throw error;

      // Rows are seeded by a DB trigger/backfill, not guaranteed to come back
      // in phase order from Postgres, so sort client-side by the fixed order.
      return (data || []).sort(
        (a, b) => PHASE_ORDER.indexOf(a.phase as PhaseName) - PHASE_ORDER.indexOf(b.phase as PhaseName)
      );
    },
    enabled: !!siteId,
  });
}
