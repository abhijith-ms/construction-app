import { useState, useEffect, useMemo } from "react";
import { format, addDays } from "date-fns";
import { toast } from "sonner";
import { useLabour } from "@/hooks/useLabour";
import { useAssignedSites } from "@/hooks/useAssignedSites";
import { useAttendance } from "@/hooks/useAttendance";
import { useCreateAttendance } from "@/hooks/useCreateAttendance";
import { useWagePermissions } from "@/hooks/useWagePermissions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronLeft, ChevronRight, Save, Calendar } from "lucide-react";
import type { TablesInsert } from "@/types/database";

type AttendanceStatus = "present" | "absent" | "half_day" | "leave";

const ATTENDANCE_STATUS_OPTIONS: { value: AttendanceStatus; label: string }[] = [
  { value: "present", label: "Present" },
  { value: "absent", label: "Absent" },
  { value: "half_day", label: "Half Day" },
  { value: "leave", label: "Leave" },
];

const WORK_CATEGORIES = [
  "mason",
  "helper",
  "electrician",
  "painter",
  "carpenter",
  "plumber",
];

type AttendanceRecord = {
  labourId: string;
  date: string; // YYYY-MM-DD
  status: AttendanceStatus | "";
  workCategory: string;
  rateApplied: number | "";
};

// Get Monday of week for a given date
function getWeekMonday(date: Date): Date {
  const day = date.getDay();
  const monday = new Date(date);
  monday.setDate(date.getDate() - ((day + 6) % 7));
  monday.setHours(0, 0, 0, 0);
  return monday;
}


export function Attendance() {
  // Week state (always Monday-based)
  const [currentWeek, setCurrentWeek] = useState<Date>(() => getWeekMonday(new Date()));
  const [selectedSiteId, setSelectedSiteId] = useState<string>("");
  
  // Track unsaved changes
  const [attendanceState, setAttendanceState] = useState<Map<string, AttendanceRecord>>(new Map());

  const { data: sites, isLoading: sitesLoading } = useAssignedSites();
  const { data: labour, isLoading: labourLoading } = useLabour();
  const { data: existingAttendance, isLoading: attendanceLoading } = useAttendance(
    selectedSiteId || null,
    format(currentWeek, "yyyy-MM-dd"),
    format(addDays(currentWeek, 5), "yyyy-MM-dd")
  );
  const { canViewWages } = useWagePermissions();
  const { mutate: saveAttendance, isPending: isSaving } = useCreateAttendance();

  // Compute week dates (Mon-Sat)
  const weekDates = useMemo(() => {
    return Array.from({ length: 6 }, (_, i) => addDays(currentWeek, i));
  }, [currentWeek]);

  // Initialize state from existing data when it loads
  useEffect(() => {
    if (existingAttendance && existingAttendance.length > 0) {
      const newMap = new Map<string, AttendanceRecord>();
      existingAttendance.forEach((record) => {
        const key = `${record.labour_id}-${record.date}`;
        newMap.set(key, {
          labourId: record.labour_id,
          date: record.date,
          status: (record.status as AttendanceStatus) || "",
          workCategory: record.work_category || "",
          rateApplied: record.rate_applied || "",
        });
      });
      setAttendanceState(newMap);
    } else {
      setAttendanceState(new Map());
    }
  }, [existingAttendance, selectedSiteId]);

  const getCellKey = (labourId: string, date: string) => `${labourId}-${date}`;

  const getCellData = (labourId: string, date: string, defaultCategory: string, defaultRate: number): AttendanceRecord => {
    const key = getCellKey(labourId, date);
    return (
      attendanceState.get(key) || {
        labourId,
        date,
        status: "",
        workCategory: defaultCategory,
        rateApplied: defaultRate,
      }
    );
  };

  const updateCell = (
    labourId: string,
    date: string,
    updates: Partial<Omit<AttendanceRecord, "labourId" | "date">>
  ) => {
    const key = getCellKey(labourId, date);
    setAttendanceState((prev) => {
      const newMap = new Map(prev);
      const existing = newMap.get(key) || { labourId, date, status: "", workCategory: "", rateApplied: "" };
      newMap.set(key, { ...existing, ...updates });
      return newMap;
    });
  };

  const handleWeekChange = (direction: "prev" | "next") => {
    const newWeek = new Date(currentWeek);
    newWeek.setDate(currentWeek.getDate() + (direction === "next" ? 7 : -7));
    setCurrentWeek(getWeekMonday(newWeek));
    setAttendanceState(new Map()); // Clear unsaved changes on week change
  };

  const handleSave = () => {
    if (!selectedSiteId) {
      toast.error("Please select a site");
      return;
    }

    // Convert attendanceState map to insert records
    const records: TablesInsert<"labour_attendance">[] = [];
    attendanceState.forEach((record) => {
      if (record.status) {
        records.push({
          labour_id: record.labourId,
          site_id: selectedSiteId,
          date: record.date,
          status: record.status,
          work_category: record.workCategory || "mason", // fallback
          rate_applied: typeof record.rateApplied === "number" ? record.rateApplied : 0,
        });
      }
    });

    if (records.length === 0) {
      toast.error("No attendance entries to save");
      return;
    }

    saveAttendance(records);
  };

  const isLoading = sitesLoading || labourLoading || attendanceLoading;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Labour Attendance</h1>
          <p className="text-slate-500 mt-1">Mark daily attendance for workers</p>
        </div>
        <Button onClick={handleSave} disabled={isSaving || !selectedSiteId}>
          {isSaving ? (
            "Saving..."
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Save Week
            </>
          )}
        </Button>
      </div>

      {/* Controls */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-4">
            {/* Site Selector */}
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-slate-700">Site:</label>
              <select
                className="h-9 w-56 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                value={selectedSiteId}
                onChange={(e) => {
                  setSelectedSiteId(e.target.value);
                  setAttendanceState(new Map());
                }}
              >
                <option value="">Select a site</option>
                {sites.map((site) => (
                  <option key={site.id} value={site.id}>
                    {site.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Week Navigation */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => handleWeekChange("prev")}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="flex items-center gap-2 px-3">
                <Calendar className="h-4 w-4 text-slate-500" />
                <span className="text-sm font-medium">
                  {format(currentWeek, "MMM d")} - {format(addDays(currentWeek, 5), "MMM d, yyyy")}
                </span>
              </div>
              <Button
                variant="outline"
                size="icon"
                onClick={() => handleWeekChange("next")}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Attendance Grid */}
      {selectedSiteId ? (
        <Card>
          <CardHeader>
            <CardTitle>Attendance Grid</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="py-8 text-center">Loading...</div>
            ) : !labour || labour.filter((l) => l.is_active).length === 0 ? (
              <div className="py-8 text-center text-slate-500">
                No active workers found
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 px-3 font-semibold text-slate-700 min-w-[150px]">
                        Worker
                      </th>
                      {weekDates.map((date) => (
                        <th
                          key={date.toISOString()}
                          className="text-center py-2 px-2 font-semibold text-slate-700 min-w-[120px]"
                        >
                          <div className="text-xs text-slate-500">{format(date, "EEE")}</div>
                          <div>{format(date, "d")}</div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {labour
                      .filter((l) => l.is_active)
                      .map((worker) => (
                        <tr key={worker.id} className="hover:bg-slate-50">
                          <td className="py-2 px-3">
                            <div className="font-medium">{worker.full_name}</div>
                            <div className="text-xs text-slate-500 capitalize">
                              {worker.default_work_category}
                            </div>
                          </td>
                          {weekDates.map((date) => {
                            const dateStr = format(date, "yyyy-MM-dd");
                            const cellData = getCellData(
                              worker.id,
                              dateStr,
                              worker.default_work_category,
                              worker.default_daily_rate
                            );

                            return (
                              <td key={dateStr} className="p-2">
                                <div className="space-y-1">
                                  {/* Status Dropdown */}
                                  <select
                                    className="w-full h-7 text-xs rounded border border-input px-1"
                                    value={cellData.status || ""}
                                    onChange={(e) =>
                                      updateCell(worker.id, dateStr, {
                                        status: (e.target.value as AttendanceStatus) || "",
                                      })
                                    }
                                  >
                                    <option value="">—</option>
                                    {ATTENDANCE_STATUS_OPTIONS.map((opt) => (
                                      <option key={opt.value} value={opt.value}>
                                        {opt.label}
                                      </option>
                                    ))}
                                  </select>

                                  {/* Work Category */}
                                  <select
                                    className="w-full h-7 text-xs rounded border border-input px-1"
                                    value={cellData.workCategory || worker.default_work_category}
                                    onChange={(e) =>
                                      updateCell(worker.id, dateStr, {
                                        workCategory: e.target.value,
                                      })
                                    }
                                  >
                                    {WORK_CATEGORIES.map((cat) => (
                                      <option key={cat} value={cat}>
                                        {cat}
                                      </option>
                                    ))}
                                  </select>

                                  {/* Rate - hidden for supervisors without permission */}
                                  {canViewWages && (
                                    <input
                                      type="number"
                                      className="w-full h-7 text-xs rounded border border-input px-1"
                                      value={cellData.rateApplied || ""}
                                      onChange={(e) =>
                                        updateCell(worker.id, dateStr, {
                                          rateApplied: parseFloat(e.target.value) || "",
                                        })
                                      }
                                      placeholder="Rate"
                                    />
                                  )}
                                </div>
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
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-slate-500">Select a site to view and edit attendance</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
