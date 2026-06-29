import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import type { TablesInsert } from "@/types/database";

type AttendanceInsert = TablesInsert<"labour_attendance">;

interface SaveAttendanceParams {
  records: AttendanceInsert[];
  canViewWages: boolean;
  // Lookup map for worker default rates: { [labourId]: defaultRate }
  workerDefaultRates?: Record<string, number>;
}

/**
 * Hook to save (upsert) attendance records for a week
 * Uses upsert: updates existing, inserts new records
 * Conditionally includes rate_applied based on wage visibility permission
 */
export function useCreateAttendance() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ records, canViewWages, workerDefaultRates }: SaveAttendanceParams) => {
      if (records.length === 0) {
        throw new Error("No attendance records to save");
      }

      // Process records to set rate_applied based on status and wage visibility
      // DB constraint requires rate_applied to be non-null for present/half_day
      const processedRecords = records.map((record) => {
        const isAbsentOrLeave = record.status === "absent" || record.status === "leave";
        
        let rateApplied: number | null;
        if (isAbsentOrLeave) {
          // Absent/leave doesn't need a rate
          rateApplied = null;
        } else if (canViewWages) {
          // User can view wages - use the rate they entered (or fallback to worker default)
          const workerDefault = workerDefaultRates?.[record.labour_id] ?? 0;
          rateApplied = typeof record.rate_applied === "number" ? record.rate_applied : workerDefault;
        } else {
          // User lacks wage visibility - silently use worker's default rate from lookup
          rateApplied = workerDefaultRates?.[record.labour_id] ?? 0;
        }
        
        return {
          labour_id: record.labour_id,
          site_id: record.site_id,
          date: record.date,
          status: record.status,
          work_category: record.work_category || "mason", // Ensure work_category is never null
          last_edited_by: record.last_edited_by,
          rate_applied: rateApplied,
        };
      });

      const { data, error } = await supabase
        .from("labour_attendance")
        .upsert(processedRecords, {
          onConflict: "labour_id,date,site_id",
          ignoreDuplicates: false,
        })
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      // Invalidate attendance query for the affected week/site
      const siteId = variables.records[0]?.site_id;
      const date = variables.records[0]?.date;
      if (siteId && date) {
        // Extract week start/end to invalidate the right query key
        const recordDate = new Date(date);
        const dayOfWeek = recordDate.getDay(); // 0 = Sunday, 1 = Monday
        const monday = new Date(recordDate);
        monday.setDate(recordDate.getDate() - ((dayOfWeek + 6) % 7)); // Go back to Monday
        const saturday = new Date(monday);
        saturday.setDate(monday.getDate() + 5); // Saturday
        
        const weekStart = monday.toISOString().split("T")[0];
        const weekEnd = saturday.toISOString().split("T")[0];
        
        queryClient.invalidateQueries({
          queryKey: ["attendance", siteId, weekStart, weekEnd],
        });
      }
      
      toast.success("Attendance saved successfully");
    },
    onError: (error) => {
      toast.error("Failed to save attendance", {
        description: error.message,
      });
    },
  });
}
