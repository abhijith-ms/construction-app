import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export interface SiteWorker {
  assignmentId: string;
  labourId: string;
  fullName: string;
  phone: string | null;
  category: string;
  defaultRate: number;
  overtimeRate: number | null;
  assignedAt: string;
  activeSiteCount: number;
}

export function useSiteWorkers(siteId: string) {
  return useQuery<SiteWorker[]>({
    queryKey: ["site-workers", siteId],
    queryFn: async () => {
      // Get active assignments for this site
      const { data: assignments, error: assignmentsError } = await (supabase as any)
        .from("site_labour_assignments")
        .select(`
          id,
          labour_id,
          assigned_at,
          labour (
            id,
            full_name,
            phone,
            default_work_category,
            default_daily_rate,
            overtime_rate
          )
        `)
        .eq("site_id", siteId)
        .eq("is_active", true)
        .order("assigned_at", { ascending: false });

      if (assignmentsError) throw assignmentsError;
      if (!assignments) return [];

      // Get active site counts for all workers via SECURITY DEFINER RPC.
      // We cannot query site_labour_assignments directly here: a supervisor's
      // RLS restricts that table to their own site(s), so the count would be
      // wrong for multi-site workers. get_labour_active_site_count() bypasses
      // RLS and always returns the true cross-site count.
      const siteCountsMap = new Map<string, number>();

      if (assignments.length > 0) {
        const countResults = await Promise.all(
          assignments.map((a: any) =>
            supabase.rpc("get_labour_active_site_count", { p_labour_id: a.labour_id })
          )
        );

        countResults.forEach((result, i) => {
          const labourId = assignments[i].labour_id;
          siteCountsMap.set(labourId, (result.data as number) ?? 0);
        });
      }

      return assignments.map((a: any) => ({
        assignmentId: a.id,
        labourId: a.labour_id,
        fullName: a.labour?.full_name || "Unknown",
        phone: a.labour?.phone || null,
        category: a.labour?.default_work_category || "Unspecified",
        defaultRate: a.labour?.default_daily_rate || 0,
        overtimeRate: a.labour?.overtime_rate ?? null,
        assignedAt: a.assigned_at,
        activeSiteCount: siteCountsMap.get(a.labour_id) || 1,
      }));
    },
    enabled: !!siteId,
  });
}
