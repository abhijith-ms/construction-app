import { useNavigate } from "react-router-dom";
import { useAuthStore } from "@/stores/authStore";
import { useDashboardStats } from "@/hooks/useDashboardStats";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Building2,
  Users,
  Shield,
  CalendarCheck,
  IndianRupee,
  Receipt,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";

export function Dashboard() {
  const { profile } = useAuthStore();
  const navigate = useNavigate();
  const { data: stats, isLoading } = useDashboardStats();

  const isSupervisor = profile?.role === "supervisor";
  const canManage = profile?.role === "admin" || profile?.role === "office_manager";

  const handleNavigate = (path: string) => {
    navigate(path);
  };

  const roleDescription = {
    admin: "Full access to all features and settings",
    office_manager: "Manage sites, workers, and inventory",
    supervisor: "View assigned sites and manage daily logs",
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-slate-500 mt-1">
          Welcome back, {profile?.full_name || "User"}
        </p>
      </div>

      {/* User Info Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Account Information
          </CardTitle>
          <CardDescription>Your current role and permissions</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div>
            <p className="text-sm font-medium text-slate-500">Full Name</p>
            <p className="text-lg font-medium">{profile?.full_name || "N/A"}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Role</p>
            <p className="text-lg font-medium capitalize">{profile?.role || "N/A"}</p>
          </div>
          <div className="md:col-span-2">
            <p className="text-sm font-medium text-slate-500">Permissions</p>
            <p className="text-sm text-slate-600">
              {profile?.role
                ? roleDescription[profile.role as keyof typeof roleDescription]
                : "N/A"}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Stats Grid */}
      <div>
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Overview</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Active Sites */}
          <Card
            className="cursor-pointer hover:bg-slate-50 transition-colors"
            onClick={() => handleNavigate("/sites")}
          >
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Active Sites</CardTitle>
              <Building2 className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
              ) : (
                <div className="text-2xl font-bold">{stats?.activeSitesCount ?? 0}</div>
              )}
              <p className="text-xs text-slate-500">
                {isSupervisor ? "Your assigned sites" : "All active sites"}
              </p>
            </CardContent>
          </Card>

          {/* Active Workers */}
          <Card
            className="cursor-pointer hover:bg-slate-50 transition-colors"
            onClick={() => handleNavigate("/labour")}
          >
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Active Workers</CardTitle>
              <Users className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
              ) : (
                <div className="text-2xl font-bold">{stats?.activeWorkersCount ?? 0}</div>
              )}
              <p className="text-xs text-slate-500">Currently active</p>
            </CardContent>
          </Card>

          {/* Pending Settlements */}
          {canManage && (
            <Card
              className="cursor-pointer hover:bg-slate-50 transition-colors"
              onClick={() => handleNavigate("/payroll")}
            >
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Pending Settlements</CardTitle>
                <AlertCircle className="h-4 w-4 text-amber-500" />
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
                ) : (
                  <div className="text-2xl font-bold">{stats?.pendingSettlementsCount ?? 0}</div>
                )}
                <p className="text-xs text-slate-500">This week</p>
              </CardContent>
            </Card>
          )}

          {/* Monthly Income */}
          {canManage && (
            <Card
              className="cursor-pointer hover:bg-slate-50 transition-colors"
              onClick={() => handleNavigate("/pay-receipts")}
            >
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Monthly Income</CardTitle>
                <Receipt className="h-4 w-4 text-emerald-500" />
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
                ) : (
                  <div className="text-2xl font-bold">
                    {formatCurrency(stats?.monthlyIncome ?? 0)}
                  </div>
                )}
                <p className="text-xs text-slate-500">This month</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          <Button
            size="lg"
            className="h-16 text-lg justify-start gap-3"
            onClick={() => handleNavigate("/attendance")}
          >
            <CalendarCheck className="h-6 w-6" />
            Mark Attendance
          </Button>

          {canManage && (
            <Button
              size="lg"
              className="h-16 text-lg justify-start gap-3"
              onClick={() => handleNavigate("/payroll")}
            >
              <IndianRupee className="h-6 w-6" />
              View Payroll
            </Button>
          )}

          {canManage && (
            <Button
              size="lg"
              className="h-16 text-lg justify-start gap-3"
              onClick={() => handleNavigate("/expenses")}
            >
              <Receipt className="h-6 w-6" />
              Add Expense
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}