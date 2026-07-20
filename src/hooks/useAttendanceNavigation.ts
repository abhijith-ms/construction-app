import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "@/stores/authStore";
import { useAssignedSites } from "@/hooks/useAssignedSites";

/**
 * Shared "go to Attendance" behavior used by every nav entry point (desktop
 * sidebar, mobile bottom nav, Dashboard quick action):
 * - Admin/Office Manager: global /attendance route (OT Hours not available there yet).
 * - Supervisor with 1 assigned site: straight to that site's Attendance tab.
 * - Supervisor with 2+ assigned sites: caller shows a picker (isSitePickerOpen).
 * - Supervisor with 0 assigned sites: falls back to /attendance.
 */
export function useAttendanceNavigation() {
  const navigate = useNavigate();
  const { profile } = useAuthStore();
  const isSupervisor = profile?.role === "supervisor";
  const { data: assignedSites } = useAssignedSites();
  const [isSitePickerOpen, setIsSitePickerOpen] = useState(false);

  const handleAttendanceClick = () => {
    if (!isSupervisor) {
      navigate("/attendance");
      return;
    }
    const sites = assignedSites ?? [];
    if (sites.length === 0) {
      navigate("/attendance");
    } else if (sites.length === 1) {
      navigate(`/sites/${sites[0].id}?tab=attendance`);
    } else {
      setIsSitePickerOpen(true);
    }
  };

  const goToSiteAttendance = (siteId: string) => {
    setIsSitePickerOpen(false);
    navigate(`/sites/${siteId}?tab=attendance`);
  };

  return {
    isSupervisor,
    assignedSites: assignedSites ?? [],
    isSitePickerOpen,
    setIsSitePickerOpen,
    handleAttendanceClick,
    goToSiteAttendance,
  };
}
