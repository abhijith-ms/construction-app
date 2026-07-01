import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export interface LabourSiteAssignment {
  id: string;
  labour_id: string;
  site_id: string;
  site_name: string;
  task_category: string;
  daily_rate: number;
  start_date: string;
  end_date: string | null;
  notes: string | null;
  assigned_by: string;
  created_at: string;
}

export function useLabourSiteAssignments(labourId: string | null) {
  return useQuery({
    queryKey: ["labour_site_assignments", labourId],
    queryFn: async (): Promise<LabourSiteAssignment[]> => {
      if (!labourId) return [];
      const client = supabase as any;
      const { data, error } = await client
        .from("labour_site_assignments")
        .select(`
          *,
          sites!labour_site_assignments_site_id_fkey(name)
        `)
        .eq("labour_id", labourId)
        .order("start_date", { ascending: false });

      if (error) throw error;
      
      return (data || []).map((item: any) => ({
        id: item.id,
        labour_id: item.labour_id,
        site_id: item.site_id,
        site_name: item.sites?.name || "Unknown Site",
        task_category: item.task_category,
        daily_rate: item.daily_rate,
        start_date: item.start_date,
        end_date: item.end_date,
        notes: item.notes,
        assigned_by: item.assigned_by,
        created_at: item.created_at,
      }));
    },
    enabled: !!labourId,
  });
}
