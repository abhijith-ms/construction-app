import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export interface ActiveSiteAssignment {
  id: string;
  labour_id: string;
  site_id: string;
  site_name: string;
  labour_name: string;
  task_category: string;
  daily_rate: number;
  start_date: string;
  notes: string | null;
}

export function useActiveSiteAssignments(siteId: string | null) {
  return useQuery({
    queryKey: ["active_site_assignments", siteId],
    queryFn: async (): Promise<ActiveSiteAssignment[]> => {
      if (!siteId) return [];
      const client = supabase as any;
      const { data, error } = await client
        .from("labour_site_assignments")
        .select(`
          *,
          labour(id, full_name, phone),
          sites!labour_site_assignments_site_id_fkey(name)
        `)
        .eq("site_id", siteId)
        .is("end_date", null)
        .order("start_date", { ascending: false });

      if (error) throw error;
      
      return (data || []).map((item: any) => ({
        id: item.id,
        labour_id: item.labour_id,
        site_id: item.site_id,
        site_name: item.sites?.name || "Unknown Site",
        labour_name: item.labour?.full_name || "Unknown Labourer",
        task_category: item.task_category,
        daily_rate: item.daily_rate,
        start_date: item.start_date,
        notes: item.notes,
      }));
    },
    enabled: !!siteId,
  });
}
