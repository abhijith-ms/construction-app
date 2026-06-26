import { useAuthStore } from "@/stores/authStore";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Building2, Users, ClipboardList, Shield } from "lucide-react";

export function Dashboard() {
  const { profile } = useAuthStore();

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

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Sites</CardTitle>
            <Building2 className="h-4 w-4 text-slate-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Manage</div>
            <p className="text-xs text-slate-500">View all construction sites</p>
          </CardContent>
        </Card>

        {profile?.role !== "supervisor" && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Workers</CardTitle>
              <Users className="h-4 w-4 text-slate-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">Manage</div>
              <p className="text-xs text-slate-500">View and assign workers</p>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Inventory</CardTitle>
            <ClipboardList className="h-4 w-4 text-slate-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Track</div>
            <p className="text-xs text-slate-500">Monitor materials and tools</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}