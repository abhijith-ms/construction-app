import { useEffect } from "react";
import { Outlet, useNavigate, NavLink } from "react-router-dom";
import { useAuthStore } from "@/stores/authStore";
import { Button } from "@/components/ui/button";
import { Toaster } from "sonner";
import { Loader2, LogOut, Building2, LayoutDashboard, ClipboardList, Users, CalendarCheck, Briefcase, UserCheck, IndianRupee, Receipt } from "lucide-react";

export function ProtectedLayout() {
  const navigate = useNavigate();
  const { isAuthenticated, loading, profile, signOut, initialize } = useAuthStore();

  // Initialize auth state on mount
  useEffect(() => {
    initialize();
  }, [initialize]);

  // Redirect to login if not authenticated and not loading
  useEffect(() => {
    if (!loading && !isAuthenticated) {
      navigate("/login", { replace: true });
    }
  }, [isAuthenticated, loading, navigate]);

  const handleLogout = async () => {
    await signOut();
    navigate("/login");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-2 px-4 py-2 rounded-md transition-colors ${
      isActive
        ? "bg-primary text-primary-foreground"
        : "text-foreground hover:bg-slate-100"
    }`;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo/Brand */}
            <div className="flex items-center gap-2">
              <Building2 className="h-6 w-6" />
              <span className="text-lg font-semibold">Construction ERP</span>
            </div>

            {/* Navigation */}
            <nav className="hidden md:flex items-center gap-2">
              <NavLink to="/dashboard" className={navLinkClass}>
                <LayoutDashboard className="h-4 w-4" />
                Dashboard
              </NavLink>
              <NavLink to="/sites" className={navLinkClass}>
                <ClipboardList className="h-4 w-4" />
                Sites
              </NavLink>
              <NavLink to="/labour" className={navLinkClass}>
                <Users className="h-4 w-4" />
                Labour
              </NavLink>
              <NavLink to="/attendance" className={navLinkClass}>
                <CalendarCheck className="h-4 w-4" />
                Labour Attendance
              </NavLink>
              <NavLink to="/staff" className={navLinkClass}>
                <Briefcase className="h-4 w-4" />
                Staff
              </NavLink>
              <NavLink to="/staff-attendance" className={navLinkClass}>
                <UserCheck className="h-4 w-4" />
                Staff Attendance
              </NavLink>
              <NavLink to="/expenses" className={navLinkClass}>
                <Receipt className="h-4 w-4" />
                Expenses
              </NavLink>
              <NavLink to="/payroll" className={navLinkClass}>
                <IndianRupee className="h-4 w-4" />
                Payroll
              </NavLink>
            </nav>

            {/* User Info & Logout */}
            <div className="flex items-center gap-4">
              <div className="text-sm text-right hidden sm:block">
                <p className="font-medium">{profile?.full_name || "User"}</p>
                <p className="text-slate-500 capitalize">{profile?.role || ""}</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                className="flex items-center gap-2"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">Logout</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </main>

      {/* Toast Notifications */}
      <Toaster position="top-right" richColors />
    </div>
  );
}