import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { Tables } from "@/types/database";

type Attendance = Tables<"labour_attendance_secure">;

/**
 * Hook to fetch labour attendance for a specific week and site
 * @param siteId - The site ID to filter by
 * @param weekStart - Monday of the week (ISO date string)
 * @param weekEnd - Saturday of the week (ISO date string)
 */
export function useAttendance(siteId: string | null, weekStart: string, weekEnd: string) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["attendance", siteId, weekStart, weekEnd],
    queryFn: async () => {
      if (!siteId) return [];

      const { data: attendance, error } = await supabase
        .from("labour_attendance_secure")
        .select("*")
        .eq("site_id", siteId)
        .gte("date", weekStart)
        .lte("date", weekEnd);

      if (error) throw error;
      return attendance as Attendance[];
    },
    enabled: !!siteId && !!weekStart && !!weekEnd,
  });

  return { data: data ?? [], isLoading, error };
}
