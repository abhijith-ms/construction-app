import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { Tables } from "@/types/database";

export type Labour = Tables<"labour">;

export interface LabourWithSiteAssignments {
  id: string;
  full_name: string;
  phone: string | null;
  default_work_category: string;
  default_daily_rate: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  activeSites: { id: string; name: string }[];
  activeSiteCount: number;
}

export function useLabourPool() {
  return useQuery<LabourWithSiteAssignments[]>({
    queryKey: ["labour-pool"],
    queryFn: async () => {
      // Get all labour workers
      const { data: labourData, error: labourError } = await supabase
        .from("labour")
        .select("*")
        .order("full_name", { ascending: true });

      if (labourError) throw labourError;
      if (!labourData) return [];

      // Get active rate/category assignments for all labour.
      // "Active" = end_date IS NULL (open-ended assignment).
      // This answers "where is this worker currently deployed?" for the badge.
      // Note: site_labour_assignments (roster table) is NOT queried here —
      // that table is for the attendance screen only.
      const { data: assignmentsData, error: assignmentsError } = await supabase
        .from("labour_site_assignments")
        .select(`
          labour_id,
          site_id,
          sites!labour_site_assignments_site_id_fkey (
            id,
            name
          )
        `)
        .is("end_date", null);

      if (assignmentsError) throw assignmentsError;

      // Build a map of labour_id to their active sites
      const siteAssignmentsMap = new Map<
        string,
        { id: string; name: string }[]
      >();

      assignmentsData?.forEach((assignment: any) => {
        const labourId = assignment.labour_id;
        if (!siteAssignmentsMap.has(labourId)) {
          siteAssignmentsMap.set(labourId, []);
        }
        const siteName = assignment.sites?.name || "Unknown Site";
        const siteId = assignment.sites?.id || assignment.site_id;
        siteAssignmentsMap.get(labourId)?.push({
          id: siteId,
          name: siteName,
        });
      });

      // Merge labour data with their site assignments
      return labourData.map((labour) => {
        const activeSites = siteAssignmentsMap.get(labour.id) || [];
        return {
          ...labour,
          activeSites,
          activeSiteCount: activeSites.length,
        };
      });
    },
  });
}
