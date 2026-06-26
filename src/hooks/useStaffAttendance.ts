import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import type { Tables, TablesInsert } from "@/types/database";
import { startOfWeek } from "date-fns";

interface WeekParams {
  weekStart: Date;
}

const STAFF_ATTENDANCE_QUERY_KEY = "staff_attendance" as const;

// Get all attendance records for a specific week (Monday-Saturday)
export function useWeekStaffAttendance({ weekStart }: WeekParams) {
  return useQuery({
    queryKey: [STAFF_ATTENDANCE_QUERY_KEY, weekStart.toISOString().split("T")[0]],
    queryFn: async () => {
      const weekStartStr = weekStart.toISOString().split("T")[0];
      const weekEndStr = new Date(weekStart.getTime() + 5 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0];

      const { data, error } = await supabase
        .from("staff_attendance")
        .select("*, staff(*)")
        .gte("date", weekStartStr)
        .lte("date", weekEndStr)
        .order("date");

      if (error) throw error;
      return data as (Tables<"staff_attendance"> & { staff: Tables<"staff"> })[];
    },
  });
}

// Get attendance for a specific staff member for a specific date
export function useStaffDayAttendance(staffId: string | null, date: Date) {
  return useQuery({
    queryKey: [STAFF_ATTENDANCE_QUERY_KEY, staffId, date.toISOString().split("T")[0]],
    queryFn: async () => {
      if (!staffId) return null;

      const dateStr = date.toISOString().split("T")[0];

      const { data, error } = await supabase
        .from("staff_attendance")
        .select("*")
        .eq("staff_id", staffId)
        .eq("date", dateStr)
        .single();

      if (error && error.code !== "PGRST116") throw error; // PGRST116 = no rows
      return data as Tables<"staff_attendance"> | null;
    },
    enabled: !!staffId,
  });
}

// Create or update attendance for a staff member on a specific date
export function useUpsertStaffAttendance() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      staffId,
      date,
      status,
    }: {
      staffId: string;
      date: Date;
      status: TablesInsert<"staff_attendance">["status"];
    }) => {
      const dateStr = date.toISOString().split("T")[0];
      void startOfWeek(date, { weekStartsOn: 1 }); // Monday (used for query key invalidation on success)

      // Upsert attendance - insert if not exists, update if exists
      const { data, error } = await supabase
        .from("staff_attendance")
        .upsert(
          {
            staff_id: staffId,
            date: dateStr,
            status,
          },
          { onConflict: "staff_id,date" }
        )
        .select()
        .single();

      if (error) throw error;
      return data as Tables<"staff_attendance">;
    },
    onSuccess: (_, { date }) => {
      const weekStart = startOfWeek(date, { weekStartsOn: 1 });
      queryClient.invalidateQueries({
        queryKey: [STAFF_ATTENDANCE_QUERY_KEY, weekStart.toISOString().split("T")[0]],
      });
      toast.success("Attendance saved");
    },
    onError: (error) => {
      toast.error(`Failed to save attendance: ${error.message}`);
    },
  });
}

// Bulk upsert attendance for multiple days
export function useBulkUpsertStaffAttendance() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      records: { staff_id: string; date: string; status: TablesInsert<"staff_attendance">["status"] }[]
    ) => {
      if (records.length === 0) return [];

      const { data, error } = await supabase
        .from("staff_attendance")
        .upsert(records, { onConflict: "staff_id,date" })
        .select();

      if (error) throw error;
      return data as Tables<"staff_attendance">[];
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [STAFF_ATTENDANCE_QUERY_KEY] });
      toast.success("Attendance records saved");
    },
    onError: (error) => {
      toast.error(`Failed to save attendance: ${error.message}`);
    },
  });
}

// Get attendance report for a specific month
export function useStaffMonthlyAttendance(month: Date, staffId?: string) {
  return useQuery({
    queryKey: ["staff_monthly_attendance", month.toISOString().slice(0, 7), staffId],
    queryFn: async () => {
      const year = month.getFullYear();
      const monthIdx = month.getMonth();
      const startDate = new Date(year, monthIdx, 1).toISOString().split("T")[0];
      const endDate = new Date(year, monthIdx + 1, 0).toISOString().split("T")[0];

      let query = supabase
        .from("staff_attendance")
        .select("*, staff(*)")
        .gte("date", startDate)
        .lte("date", endDate)
        .order("date");

      if (staffId) {
        query = query.eq("staff_id", staffId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as (Tables<"staff_attendance"> & { staff: Tables<"staff"> })[];
    },
  });
}
