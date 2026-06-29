import { NavLink, useLocation } from "react-router-dom";
import { useAuthStore } from "@/stores/authStore";
import {
  LayoutDashboard,
  CalendarCheck,
  Users,
  MoreHorizontal,
  Briefcase,
  IndianRupee,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useState } from "react";

interface NavItem {
  to: string;
  label: string;
  icon: React.ReactNode;
  showFor: ("admin" | "office_manager" | "supervisor")[];
}

const navItems: NavItem[] = [
  {
    to: "/dashboard",
    label: "Dashboard",
    icon: <LayoutDashboard className="h-5 w-5" />,
    showFor: ["admin", "office_manager", "supervisor"],
  },
  {
    to: "/attendance",
    label: "Attendance",
    icon: <CalendarCheck className="h-5 w-5" />,
    showFor: ["admin", "office_manager", "supervisor"],
  },
  {
    to: "/labour",
    label: "Labour",
    icon: <Users className="h-5 w-5" />,
    showFor: ["admin", "office_manager", "supervisor"],
  },
  {
    to: "/staff",
    label: "Staff",
    icon: <Briefcase className="h-5 w-5" />,
    showFor: ["admin", "office_manager", "supervisor"],
  },
  {
    to: "/payroll",
    label: "Payroll",
    icon: <IndianRupee className="h-5 w-5" />,
    showFor: ["admin", "office_manager", "supervisor"],
  },
];

const moreItems: NavItem[] = [
  {
    to: "/sites",
    label: "Sites",
    icon: <LayoutDashboard className="h-5 w-5" />,
    showFor: ["admin", "office_manager", "supervisor"],
  },
  {
    to: "/staff-attendance",
    label: "Staff Attendance",
    icon: <CalendarCheck className="h-5 w-5" />,
    showFor: ["admin", "office_manager", "supervisor"],
  },
  {
    to: "/expenses",
    label: "Expenses",
    icon: <IndianRupee className="h-5 w-5" />,
    showFor: ["admin", "office_manager", "supervisor"],
  },
  {
    to: "/suppliers",
    label: "Suppliers",
    icon: <Users className="h-5 w-5" />,
    showFor: ["admin", "office_manager"],
  },
  {
    to: "/stock",
    label: "Stock",
    icon: <LayoutDashboard className="h-5 w-5" />,
    showFor: ["admin", "office_manager"],
  },
  {
    to: "/reports",
    label: "Reports",
    icon: <LayoutDashboard className="h-5 w-5" />,
    showFor: ["admin", "office_manager"],
  },
  {
    to: "/pay-receipts",
    label: "Pay Receipts",
    icon: <IndianRupee className="h-5 w-5" />,
    showFor: ["admin", "office_manager"],
  },
  {
    to: "/users",
    label: "Users",
    icon: <Users className="h-5 w-5" />,
    showFor: ["admin", "office_manager"],
  },
];

interface NavButtonProps {
  to: string;
  label: string;
  icon: React.ReactNode;
  isActive: boolean;
}

function NavButton({ to, label, icon, isActive }: NavButtonProps) {
  return (
    <NavLink
      to={to}
      className={`flex flex-col items-center justify-center gap-1 py-2 px-3 min-w-[64px] min-h-[56px] rounded-lg transition-colors ${
        isActive ? "text-primary" : "text-slate-500 hover:text-slate-700"
      }`}
    >
      <span className={isActive ? "text-primary" : ""}>{icon}</span>
      <span className="text-xs font-medium">{label}</span>
    </NavLink>
  );
}

export function MobileBottomNav() {
  const { profile } = useAuthStore();
  const location = useLocation();
  const [moreOpen, setMoreOpen] = useState(false);
  const role = profile?.role as "admin" | "office_manager" | "supervisor" | undefined;

  if (!role) return null;

  // Filter items based on role
  const visibleNavItems = navItems.filter((item) =>
    item.showFor.includes(role)
  );
  const visibleMoreItems = moreItems.filter((item) =>
    item.showFor.includes(role)
  );

  // Take first 4 items for the main nav (leaving room for More)
  const mainNavItems = visibleNavItems.slice(0, 4);
  const needsMore = visibleNavItems.length > 4 || visibleMoreItems.length > 0;

  // Determine if we're in a "more" route
  const isMoreActive = visibleMoreItems.some(
    (item) => location.pathname === item.to
  ) || visibleNavItems.slice(4).some((item) => location.pathname === item.to);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-slate-200 shadow-lg md:hidden pb-safe">
      <div className="flex items-center justify-around px-2">
        {mainNavItems.map((item) => (
          <NavButton
            key={item.to}
            to={item.to}
            label={item.label}
            icon={item.icon}
            isActive={location.pathname === item.to}
          />
        ))}
        {needsMore && (
          <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
            <SheetTrigger asChild>
              <button
                className={`flex flex-col items-center justify-center gap-1 py-2 px-3 min-w-[64px] min-h-[56px] rounded-lg transition-colors ${
                  isMoreActive
                    ? "text-primary"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                <MoreHorizontal className="h-5 w-5" />
                <span className="text-xs font-medium">More</span>
              </button>
            </SheetTrigger>
            <SheetContent side="bottom" className="h-auto pb-safe rounded-t-xl">
              <SheetHeader>
                <SheetTitle className="text-center">More Options</SheetTitle>
              </SheetHeader>
              <div className="grid grid-cols-3 gap-4 py-6">
                {[...visibleNavItems.slice(4), ...visibleMoreItems].map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    onClick={() => setMoreOpen(false)}
                    className={`flex flex-col items-center justify-center gap-2 p-4 rounded-xl transition-colors min-h-[80px] ${
                      location.pathname === item.to
                        ? "bg-primary/10 text-primary"
                        : "bg-slate-50 text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    {item.icon}
                    <span className="text-sm font-medium text-center">
                      {item.label}
                    </span>
                  </NavLink>
                ))}
              </div>
            </SheetContent>
          </Sheet>
        )}
      </div>
    </nav>
  );
}
