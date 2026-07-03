import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export interface SiteAttendanceSummary {
  siteId: string;
  siteName: string;
  markedCount: number;
  workers: Array<{
    labourId: string;
    labourName: string;
    status: "present" | "absent" | "half_day" | "leave" | null;
    workCategory: string;
  }>;
}

export interface AllSitesAttendanceData {
  date: string;
  sites: SiteAttendanceSummary[];
}

/**
 * Hook to fetch today's attendance from labour_attendance_secure
 * joined with labour (name) and sites (name)
 * Groups by site - Only for Admin and Office Manager
 */
export function useAllSitesAttendance(date: string) {
  return useQuery<AllSitesAttendanceData, Error>({
    queryKey: ["all-sites-attendance", date],
    queryFn: async () => {
      // Fetch all sites first
      const { data: sitesData, error: sitesError } = await supabase
        .from("sites")
        .select("id, name")
        .eq("status", "active");

      if (sitesError) throw sitesError;

      // Fetch today's attendance across all sites with labour info
      const { data: attendanceData, error: attendanceError } = await supabase
        .from("labour_attendance_secure")
        .select("*, labour:labour(id, full_name)")
        .eq("date", date);

      if (attendanceError) throw attendanceError;

      // Group attendance by site
      const attendanceBySite = new Map<string, NonNullable<typeof attendanceData>>();
      attendanceData?.forEach((record) => {
        const siteId = record.site_id;
        if (!siteId) return;
        if (!attendanceBySite.has(siteId)) {
          attendanceBySite.set(siteId, []);
        }
        const siteRecords = attendanceBySite.get(siteId);
        if (siteRecords) {
          siteRecords.push(record);
        }
      });

      // Build site summaries
      const sites: SiteAttendanceSummary[] = (sitesData || []).map((site) => {
        const siteAttendance = attendanceBySite.get(site.id) || [];
        const markedCount = siteAttendance.length;

        const workers = siteAttendance
          .filter((record) => record.labour_id) // Filter out records without labour_id
          .map((record) => ({
            labourId: record.labour_id ?? "",
            labourName: record.labour?.full_name ?? "Unknown",
            status: (record.status as "present" | "absent" | "half_day" | "leave") ?? null,
            workCategory: record.work_category ?? "",
          }));

        return {
          siteId: site.id,
          siteName: site.name ?? site.id, // Fallback to ID if name is null
          markedCount,
          workers,
        };
      });

      // Sort sites: those with attendance first, then alphabetically
      sites.sort((a, b) => {
        if (a.markedCount > 0 && b.markedCount === 0) return -1;
        if (a.markedCount === 0 && b.markedCount > 0) return 1;
        return a.siteName.localeCompare(b.siteName);
      });

      return {
        date,
        sites,
      };
    },
    enabled: !!date,
  });
}
