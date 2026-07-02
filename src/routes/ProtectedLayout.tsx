import { useEffect } from "react";
import { Outlet, useNavigate, NavLink } from "react-router-dom";
import { useAuthStore } from "@/stores/authStore";
import { Button } from "@/components/ui/button";
import { Toaster } from "sonner";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { 
  Loader2, LogOut, Building2, LayoutDashboard, ClipboardList, Users, 
  CalendarCheck, Briefcase, UserCheck, IndianRupee, Receipt, UserCog, 
  Truck, Package, BarChart3 
} from "lucide-react";

// Navigation item type
interface NavItem {
  to: string;
  label: string;
  icon: React.ReactNode;
  adminOnly?: boolean;
}

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

  const isAdmin = profile?.role === "admin" || profile?.role === "office_manager";

  const navItems: NavItem[] = [
    { to: "/dashboard", label: "Dashboard", icon: <LayoutDashboard className="h-5 w-5" /> },
    { to: "/sites", label: "Sites", icon: <ClipboardList className="h-5 w-5" /> },
    { to: "/labour", label: "Labour", icon: <Users className="h-5 w-5" /> },
    { to: "/attendance", label: "Attendance", icon: <CalendarCheck className="h-5 w-5" /> },
    { to: "/staff", label: "Staff", icon: <Briefcase className="h-5 w-5" /> },
    { to: "/staff-attendance", label: "Staff Att.", icon: <UserCheck className="h-5 w-5" /> },
    { to: "/expenses", label: "Expenses", icon: <Receipt className="h-5 w-5" /> },
    { to: "/payroll", label: "Payroll", icon: <IndianRupee className="h-5 w-5" /> },
    { to: "/stock", label: "Stock", icon: <Package className="h-5 w-5" /> },
    ...(isAdmin ? [
      { to: "/suppliers", label: "Suppliers", icon: <Truck className="h-5 w-5" />, adminOnly: true },
      { to: "/reports", label: "Reports", icon: <BarChart3 className="h-5 w-5" />, adminOnly: true },
      { to: "/pay-receipts", label: "Receipts", icon: <Receipt className="h-5 w-5" />, adminOnly: true },
      { to: "/users", label: "Users", icon: <UserCog className="h-5 w-5" />, adminOnly: true },
    ] : []),
  ];

  const sidebarLinkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-sm ${
      isActive
        ? "bg-primary text-primary-foreground"
        : "text-slate-600 hover:bg-slate-100"
    }`;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Mobile Header - Only visible on small screens */}
      <header className="md:hidden bg-white border-b sticky top-0 z-40">
        <div className="flex items-center justify-between h-16 px-4">
          <div className="flex items-center gap-2">
            <Building2 className="h-6 w-6" />
            <span className="text-lg font-semibold">Construction ERP</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="text-sm text-right">
              <p className="font-medium">{profile?.full_name || "User"}</p>
            </div>
          </div>
        </div>
      </header>

      {/* Desktop Sidebar - Hidden on mobile, visible on md: and above */}
      <aside className="hidden md:flex fixed left-0 top-0 h-screen w-56 bg-white border-r border-slate-200 z-40 flex-col">
        {/* Logo/Brand */}
        <div className="p-4 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <Building2 className="h-6 w-6 text-primary" />
            <span className="text-lg font-semibold">Construction ERP</span>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={sidebarLinkClass}
            >
              {item.icon}
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        {/* User Info & Logout at bottom */}
        <div className="p-4 border-t border-slate-200">
          <div className="mb-3">
            <p className="font-medium text-sm">{profile?.full_name || "User"}</p>
            <p className="text-xs text-slate-500 capitalize">{profile?.role || ""}</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </Button>
        </div>
      </aside>

      {/* Main Content - With margin-left on desktop */}
      <main className="md:ml-56 px-4 sm:px-6 lg:px-8 py-4 md:py-8 pb-24 md:pb-8">
        <Outlet />
      </main>

      {/* Toast Notifications */}
      <Toaster position="top-right" richColors />

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav />
    </div>
  );
}