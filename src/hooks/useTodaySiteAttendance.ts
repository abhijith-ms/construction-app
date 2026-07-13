import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { format } from "date-fns";

export interface SiteAttendanceRecord {
  id: string;
  labourId: string;
  fullName: string;
  category: string;
  status: "present" | "absent" | "half_day" | "leave";
  rateApplied: number | null;
}

export function useTodaySiteAttendance(siteId: string, date?: Date) {
  const targetDate = date || new Date();
  const dateStr = format(targetDate, "yyyy-MM-dd");

  return useQuery<SiteAttendanceRecord[]>({
    queryKey: ["site-attendance", siteId, dateStr],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("labour_attendance_secure")
        .select(`
          id,
          labour_id,
          status,
          rate_applied,
          labour (
            id,
            full_name,
            default_work_category
          )
        `)
        .eq("site_id", siteId)
        .eq("date", dateStr)
        .order("labour(full_name)", { ascending: true });

      if (error) throw error;
      if (!data) return [];

      return data.map((record: any) => ({
        id: record.id,
        labourId: record.labour_id,
        fullName: record.labour?.full_name || "Unknown",
        category: record.labour?.default_work_category || "Unspecified",
        status: record.status as
          | "present"
          | "absent"
          | "half_day"
          | "leave",
        rateApplied: record.rate_applied,
      }));
    },
    enabled: !!siteId,
  });
}
