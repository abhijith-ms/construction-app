import React, { useState, useEffect, useMemo } from "react";
import { format, addDays } from "date-fns";
import { toast } from "sonner";
import { useLabour } from "@/hooks/useLabour";
import { useAssignedSites } from "@/hooks/useAssignedSites";
import { useAttendance } from "@/hooks/useAttendance";
import { useCreateAttendance } from "@/hooks/useCreateAttendance";
import { useWagePermissions } from "@/hooks/useWagePermissions";
import { useActiveSiteAssignments, type ActiveSiteAssignment } from "@/hooks/useActiveSiteAssignments";
import { useAuthStore } from "@/stores/authStore";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronLeft, ChevronRight, Save, Calendar, User } from "lucide-react";
import type { TablesInsert } from "@/types/database";

type AttendanceStatus = "present" | "absent" | "half_day" | "leave";

const ATTENDANCE_STATUS_OPTIONS: { value: AttendanceStatus; label: string; color: string }[] = [
  { value: "present", label: "Present", color: "bg-green-500" },
  { value: "half_day", label: "Half Day", color: "bg-yellow-500" },
  { value: "absent", label: "Absent", color: "bg-red-500" },
  { value: "leave", label: "Leave", color: "bg-slate-400" },
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
  
  // Mobile-only: Select day index (0-5 for Mon-Sat)
  const [selectedDayIndex, setSelectedDayIndex] = useState<number>(0);
  
  // Track unsaved changes
  const [attendanceState, setAttendanceState] = useState<Map<string, AttendanceRecord>>(new Map());

  const { data: sites, isLoading: sitesLoading } = useAssignedSites();
  const { data: labour, isLoading: labourLoading } = useLabour();
  const { data: existingAttendance, isLoading: attendanceLoading } = useAttendance(
    selectedSiteId || null,
    format(currentWeek, "yyyy-MM-dd"),
    format(addDays(currentWeek, 5), "yyyy-MM-dd"))
  ;
  const { data: activeSiteAssignments, isLoading: assignmentsLoading } = useActiveSiteAssignments(selectedSiteId || null);
  const { canViewWages } = useWagePermissions();
  const { mutate: saveAttendance, isPending: isSaving } = useCreateAttendance();

  // Build a lookup map of active assignments by labour_id for auto-fill
  const assignmentsByLabourId = useMemo(() => {
    const map = new Map<string, ActiveSiteAssignment>();
    activeSiteAssignments?.forEach((assignment) => {
      map.set(assignment.labour_id, assignment);
    });
    return map;
  }, [activeSiteAssignments]);

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
    } else if (attendanceState.size > 0) {
      // Only reset if we actually have data to clear
      setAttendanceState(new Map());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [existingAttendance, selectedSiteId]);

  const getCellKey = (labourId: string, date: string) => `${labourId}-${date}`;

  const getCellData = (labourId: string, date: string, defaultCategory: string, defaultRate: number): AttendanceRecord => {
    const key = getCellKey(labourId, date);
    const existingRecord = attendanceState.get(key);
    
    if (existingRecord) {
      return existingRecord;
    }
    
    // Check for active assignment to auto-fill category and rate
    const assignment = assignmentsByLabourId.get(labourId);
    const autoFillCategory = assignment?.task_category || defaultCategory;
    const autoFillRate = canViewWages ? (assignment?.daily_rate ?? defaultRate) : defaultRate;
    
    return {
      labourId,
      date,
      status: "",
      workCategory: autoFillCategory,
      rateApplied: autoFillRate,
    };
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

  const { user } = useAuthStore();

  const handleSave = () => {
    if (!selectedSiteId) {
      toast.error("Please select a site");
      return;
    }

    if (!user?.id) {
      toast.error("User not authenticated");
      return;
    }

    // Build worker default rates lookup map
    const workerDefaultRates: Record<string, number> = {};
    labour?.forEach((worker) => {
      if (worker.is_active && typeof worker.default_daily_rate === "number") {
        workerDefaultRates[worker.id] = worker.default_daily_rate;
      }
    });

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
          rate_applied: typeof record.rateApplied === "number" ? record.rateApplied : undefined,
          last_edited_by: user.id,
        });
      }
    });

    if (records.length === 0) {
      toast.error("No attendance entries to save");
      return;
    }

    saveAttendance({ records, canViewWages, workerDefaultRates });
  };

  const isLoading = sitesLoading || labourLoading || attendanceLoading || assignmentsLoading;
  const activeWorkers = labour?.filter(l => l.is_active) || [];
  const selectedDate = weekDates[selectedDayIndex];

  // Worker card component for mobile - memoized to prevent unnecessary re-renders
  const WorkerAttendanceCard = React.memo(({ 
    worker, 
    dateStr 
  }: { 
    worker: typeof activeWorkers[0]; 
    dateStr: string;
  }) => {
    const cellData = getCellData(
      worker.id,
      dateStr,
      worker.default_work_category || "",
      worker.default_daily_rate || 0
    );
    
    // Status config for potential future use (color coding, etc.)
    // const statusConfig = ATTENDANCE_STATUS_OPTIONS.find(s => s.value === cellData.status);
    
    return (
      <Card className="shadow-sm">
        <CardContent className="p-4">
          {/* Worker Header */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900">{worker.full_name}</h3>
                <p className="text-sm text-slate-500 capitalize">{worker.default_work_category}</p>
              </div>
            </div>
            {canViewWages && (
              <div className="text-right">
                <p className="text-sm font-medium text-slate-700">₹{cellData.rateApplied || worker.default_daily_rate || 0}</p>
                <p className="text-xs text-slate-400">daily rate</p>
              </div>
            )}
          </div>
          
          {/* Status Buttons */}
          <div className="grid grid-cols-2 gap-2">
            {ATTENDANCE_STATUS_OPTIONS.map((status) => (
              <button
                key={status.value}
                onClick={() => updateCell(worker.id, dateStr, { status: status.value })}
                className={`py-3 px-3 rounded-lg text-sm font-medium transition-all ${
                  cellData.status === status.value
                    ? `${status.color} text-white shadow-md`
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {status.label}
              </button>
            ))}
          </div>
          
          {/* Work Category Selector */}
          <div className="mt-3">
            <label className="text-xs font-medium text-slate-500 mb-1 block">Work Category</label>
            <select
              className="w-full h-11 rounded-lg border border-input bg-white px-3 text-base"
              value={cellData.workCategory || worker.default_work_category}
              onChange={(e) => updateCell(worker.id, dateStr, { workCategory: e.target.value })}
            >
              {WORK_CATEGORIES.map((cat) => (
                <option key={cat} value={cat} className="capitalize">{cat}</option>
              ))}
            </select>
          </div>
          
          {/* Rate Input for supervisors with permission */}
          {canViewWages && (
            <div className="mt-3">
              <label className="text-xs font-medium text-slate-500 mb-1 block">Rate (₹)</label>
              <input
                type="number"
                className="w-full h-11 rounded-lg border border-input bg-white px-3 text-base"
                value={cellData.rateApplied || ""}
                onChange={(e) => updateCell(worker.id, dateStr, { 
                  rateApplied: parseFloat(e.target.value) || "" 
                })}
                placeholder="Daily rate"
              />
            </div>
          )}
        </CardContent>
      </Card>
    );
  });
  
  // Get worker count with attendance for selected date on mobile
  const workersWithAttendance = useMemo(() => {
    if (!selectedSiteId) return 0;
    const dateStr = format(selectedDate, "yyyy-MM-dd");
    return activeWorkers.filter(worker => {
      const record = getCellData(worker.id, dateStr, 
        worker.default_work_category || "", worker.default_daily_rate || 0);
      return record.status;
    }).length;
  }, [activeWorkers, selectedDate, attendanceState, selectedSiteId]);

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Mobile Header - Compact */}
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-xl md:text-3xl font-bold text-slate-900">Labour Attendance</h1>
          <p className="text-sm md:text-base text-slate-500 mt-0.5 md:mt-1">Mark daily attendance for workers</p>
        </div>
        {/* Desktop Save button */}
        <div className="hidden md:block">
          <Button onClick={handleSave} disabled={isSaving || !selectedSiteId}>
            {isSaving ? "Saving..." : <><Save className="h-4 w-4 mr-2" /> Save Week</>}
          </Button>
        </div>
      </div>

      {/* Site Selector - Full width on mobile */}
      <Card className="shadow-sm">
        <CardContent className="p-3 md:p-4">
          <div className="flex flex-col gap-3">
            {/* Site Selector */}
            <div className="w-full">
              <label className="text-sm font-medium text-slate-700 mb-1.5 block">Site</label>
              <select
                className="h-12 w-full rounded-lg border border-input bg-white px-3 text-base shadow-sm"
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

      {/* Day Tabs - Mobile Only */}
      {selectedSiteId && (
        <div className="flex gap-1 overflow-x-auto scrollbar-hide md:hidden">
          {weekDates.map((date, idx) => {
            const isSelected = idx === selectedDayIndex;
            const dayLetter = ["M", "T", "W", "T", "F", "S"][idx];
            const dateNum = format(date, "d");
            return (
              <button
                key={idx}
                onClick={() => setSelectedDayIndex(idx)}
                className={`flex flex-col items-center justify-center min-w-[48px] h-14 rounded-lg transition-colors ${
                  isSelected 
                    ? "bg-primary text-white" 
                    : "bg-white border border-slate-200 text-slate-600"
                }`}
              >
                <span className="text-xs font-medium">{dayLetter}</span>
                <span className="text-sm font-bold">{dateNum}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Attendance Content */}
      {selectedSiteId ? (
        <div className="space-y-4">
          {isLoading ? (
            <Card>
              <CardContent className="py-12 text-center">
                <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto" />
                <p className="mt-3 text-slate-500">Loading...</p>
              </CardContent>
            </Card>
          ) : activeWorkers.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-slate-500">
                No active workers found
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Mobile: Card Layout */}
              <div className="md:hidden space-y-3">
                <div className="flex items-center justify-between px-1">
                  <p className="text-sm text-slate-500">
                    {workersWithAttendance}/{activeWorkers.length} marked
                  </p>
                  <p className="text-sm font-medium text-slate-700">
                    {format(selectedDate, "EEEE, MMM d")}
                  </p>
                </div>
                {activeWorkers.map((worker) => (
                  <WorkerAttendanceCard
                    key={worker.id}
                    worker={worker}
                    dateStr={format(selectedDate, "yyyy-MM-dd")}
                  />
                ))}
              </div>

              {/* Desktop: Table Layout */}
              <Card className="hidden md:block">
                <CardContent className="p-4">
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
                        {(labour ?? [])
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
                </CardContent>
              </Card>
            </>
          )}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-slate-500">Select a site to view and edit attendance</p>
          </CardContent>
        </Card>
      )}

      {/* Mobile: Fixed Save Button */}
      <div className="fixed bottom-20 left-0 right-0 px-4 md:hidden z-40">
        <Button 
          onClick={handleSave} 
          disabled={isSaving || !selectedSiteId}
          className="w-full h-14 text-lg font-semibold shadow-lg"
        >
          {isSaving ? "Saving..." : "Save Day"}
        </Button>
      </div>

      {/* Add bottom padding for mobile to account for fixed save button */}
      <div className="h-16 md:hidden" />
    </div>
  );
}
