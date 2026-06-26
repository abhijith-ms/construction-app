import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import type { TablesInsert } from "@/types/database";

type AttendanceInsert = TablesInsert<"labour_attendance">;

/**
 * Hook to save (upsert) attendance records for a week
 * Uses upsert: updates existing, inserts new records
 */
export function useCreateAttendance() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (records: AttendanceInsert[]) => {
      if (records.length === 0) {
        throw new Error("No attendance records to save");
      }

      const { data, error } = await supabase
        .from("labour_attendance")
        .upsert(records, {
          onConflict: "labour_id,date,site_id",
          ignoreDuplicates: false,
        })
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      // Invalidate attendance query for the affected week/site
      const siteId = variables[0]?.site_id;
      const date = variables[0]?.date;
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
