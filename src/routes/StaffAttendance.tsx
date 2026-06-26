import { useState, useMemo } from "react";
import { format, startOfWeek, addDays } from "date-fns";
import { useStaff } from "@/hooks/useStaff";
import { useWeekStaffAttendance, useUpsertStaffAttendance } from "@/hooks/useStaffAttendance";
import { useAuthStore } from "@/stores/authStore";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronLeft, ChevronRight, Loader2, Users } from "lucide-react";

// Day status options
const STATUS_OPTIONS = [
  { value: "present", label: "Present", color: "bg-green-100 text-green-700" },
  { value: "absent", label: "Absent", color: "bg-red-100 text-red-700" },
  { value: "half_day", label: "Half Day", color: "bg-yellow-100 text-yellow-700" },
  { value: "leave", label: "Leave", color: "bg-blue-100 text-blue-700" },
] as const;

type AttendanceStatus = (typeof STATUS_OPTIONS)[number]["value"];

// Staff type from database
interface Staff {
  id: string;
  full_name: string;
  is_active: boolean;
}


export function StaffAttendance() {
  const { profile } = useAuthStore();
  const [weekOffset, setWeekOffset] = useState(0);

  // Calculate week range (Monday-Saturday)
  const weekStart = useMemo(() => {
    const today = new Date();
    // Get Monday of current week, then apply offset
    const base = startOfWeek(today, { weekStartsOn: 1 });
    return addDays(base, weekOffset * 7);
  }, [weekOffset]);

  const weekEnd = useMemo(() => addDays(weekStart, 5), [weekStart]);

  // Days of week for headers (Mon-Sat)
  const daysOfWeek = useMemo(() => {
    return Array.from({ length: 6 }, (_, i) => addDays(weekStart, i));
  }, [weekStart]);

  // Fetch staff and attendance data
  const { data: staffList, isLoading: isLoadingStaff } = useStaff();
  const { data: attendanceData, isLoading: isLoadingAttendance } = useWeekStaffAttendance({ weekStart });
  const upsertAttendance = useUpsertStaffAttendance();

  // Build attendance map for quick lookup
  const attendanceMap = useMemo(() => {
    const map = new Map<string, AttendanceStatus>();
    attendanceData?.forEach((record) => {
      const key = `${record.staff_id}-${record.date}`;
      map.set(key, record.status as AttendanceStatus);
    });
    return map;
  }, [attendanceData]);

  // Get attendance for a specific staff member and date
  const getAttendance = (staffId: string, date: Date): AttendanceStatus | null => {
    const dateStr = date.toISOString().split("T")[0];
    return attendanceMap.get(`${staffId}-${dateStr}`) || null;
  };

  // Handle attendance change
  const handleAttendanceChange = (staffId: string, date: Date, status: AttendanceStatus) => {
    upsertAttendance.mutate({ staffId, date, status });
  };

  // Permission check
  const canEdit = profile?.role === "admin" || profile?.role === "office_manager";

  const isLoading = isLoadingStaff || isLoadingAttendance;
  const activeStaff = (staffList as Staff[] | undefined)?.filter((s) => s.is_active) || [];

  const navigateWeek = (direction: "prev" | "next") => {
    setWeekOffset((prev) => prev + (direction === "next" ? 1 : -1));
  };

  const resetToThisWeek = () => {
    setWeekOffset(0);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Staff Attendance</h1>
          <p className="text-muted-foreground">
            Mark daily attendance for office staff
          </p>
        </div>
      </div>

      {/* Week Navigation */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <Button variant="outline" size="sm" onClick={() => navigateWeek("prev")}>
              <ChevronLeft className="h-4 w-4 mr-1" />
              Previous Week
            </Button>
            <div className="text-center">
              <p className="font-semibold">
                {format(weekStart, "MMM d")} - {format(weekEnd, "MMM d, yyyy")}
              </p>
              <p className="text-sm text-muted-foreground">
                {weekOffset === 0 ? "This Week" : `Week of ${format(weekStart, "MMM d")}`}
              </p>
            </div>
            <div className="flex gap-2">
              {weekOffset !== 0 && (
                <Button variant="ghost" size="sm" onClick={resetToThisWeek}>
                  This Week
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={() => navigateWeek("next")}>
                Next Week
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Attendance Grid */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : activeStaff.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No active staff members found</p>
              <p className="text-sm mt-2">
                Add staff members in the Staff page to start marking attendance
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium min-w-[180px]">Staff Member</th>
                    {daysOfWeek.map((day) => (
                      <th key={day.toISOString()} className="text-center px-2 py-3 font-medium min-w-[100px]">
                        <div>
                          <div className="text-sm">{format(day, "EEE")}</div>
                          <div className="text-xs text-muted-foreground">{format(day, "MMM d")}</div>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {activeStaff.map((staff) => (
                    <tr key={staff.id} className="border-b">
                      <td className="px-4 py-3 font-medium">{staff.full_name}</td>
                      {daysOfWeek.map((day) => {
                        const status = getAttendance(staff.id, day);
                        return (
                          <td key={day.toISOString()} className="px-2 py-2">
                            {canEdit ? (
                              <select
                                value={status || ""}
                                onChange={(e) =>
                                  handleAttendanceChange(
                                    staff.id,
                                    day,
                                    e.target.value as AttendanceStatus
                                  )
                                }
                                className="w-full text-sm p-2 rounded-md border bg-transparent focus:outline-none focus:ring-2 focus:ring-primary"
                                disabled={upsertAttendance.isPending}
                              >
                                <option value="">—</option>
                                {STATUS_OPTIONS.map((opt) => (
                                  <option key={opt.value} value={opt.value}>
                                    {opt.label}
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <span
                                className={`inline-flex items-center justify-center px-3 py-1 rounded-md text-xs font-medium min-w-[60px] ${
                                  status
                                    ? STATUS_OPTIONS.find((o) => o.value === status)?.color ||
                                      "bg-gray-100"
                                    : "bg-gray-50 text-gray-400"
                                }`}
                              >
                                {status
                                  ? STATUS_OPTIONS.find((o) => o.value === status)?.label ||
                                    "—"
                                  : "—"}
                              </span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Status Legend */}
      <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
        {STATUS_OPTIONS.map((opt) => (
          <div key={opt.value} className="flex items-center gap-2">
            <span className={`inline-flex w-4 h-4 rounded ${opt.color.split(" ")[0]}`}></span>
            <span>{opt.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
