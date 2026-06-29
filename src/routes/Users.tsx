import { useState } from "react";
import { useSupervisors } from "@/hooks/useSupervisors";
import { useSites } from "@/hooks/useSites";
import { useAssignSite } from "@/hooks/useAssignSite";
import { useRemoveSite } from "@/hooks/useRemoveSite";
import { useUpdateWagePermission } from "@/hooks/useUpdateWagePermission";
import { useAuthStore } from "@/stores/authStore";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { X, Plus } from "lucide-react";

// Type matching the useSupervisors hook return
interface Supervisor {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  assignedSites: { id: string; name: string }[];
  wagePermissions: { site_id: string; can_view_set_wages: boolean }[];
}

/**
 * User Management Page
 * Route: /users
 * Access: Admin and Office Manager only
 *
 * Phase 1: Read-only supervisor list ✓
 * Phase 2: Site assignment management (Admin only) — Current
 * Phase 3: Wage visibility toggles (Admin + Office Manager)
 */
export function Users() {
  const { profile } = useAuthStore();
  const { data: supervisors = [], isLoading: loadingSupervisors } = useSupervisors();
  const { data: sites = [], isLoading: loadingSites } = useSites();
  const assignSite = useAssignSite();
  const removeSite = useRemoveSite();
  const updateWagePermission = useUpdateWagePermission();

  // Track which supervisor is being edited and selected site
  const [editingSupervisor, setEditingSupervisor] = useState<string | null>(null);
  const [selectedSite, setSelectedSite] = useState<string>("");

  // Helper to check if supervisor can view wages for a specific site
  const canViewWagesForSite = (supervisor: Supervisor, siteId: string): boolean => {
    const permission = supervisor.wagePermissions.find((p) => p.site_id === siteId);
    return permission?.can_view_set_wages ?? false;
  };

  // Handle wage visibility toggle
  const handleToggleWagePermission = async (
    supervisorId: string,
    siteId: string,
    currentValue: boolean
  ) => {
    await updateWagePermission.mutateAsync({
      supervisorId,
      siteId,
      canViewSetWages: !currentValue,
    });
  };

  const isAdmin = profile?.role === "admin";
  const isOfficeManager = profile?.role === "office_manager";

  // Page should only be accessible to Admin and Office Manager
  if (!isAdmin && !isOfficeManager) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <p className="text-muted-foreground">
          You do not have permission to view this page.
        </p>
      </div>
    );
  }

  const loading = loadingSupervisors || loadingSites;

  // Get unassigned sites for a supervisor
  const getUnassignedSites = (supervisor: Supervisor) => {
    const assignedSiteIds = new Set(supervisor.assignedSites.map((s) => s.id));
    return sites.filter((site) => !assignedSiteIds.has(site.id));
  };

  const handleAddSite = async (supervisorId: string) => {
    if (!selectedSite) return;
    await assignSite.mutateAsync({ supervisorId, siteId: selectedSite });
    setEditingSupervisor(null);
    setSelectedSite("");
  };

  const handleRemoveSite = async (supervisorId: string, siteId: string) => {
    await removeSite.mutateAsync({ supervisorId, siteId });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold">User Management</h1>
        <p className="text-muted-foreground">
          Manage supervisor site assignments and wage permissions
        </p>
      </div>

      {/* Phase 2: Supervisor list with site management - Desktop Table */}
      <Card className="hidden md:block">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Supervisors
            {isAdmin && (
              <Badge variant="secondary">Admin</Badge>
            )}
            {isOfficeManager && (
              <Badge variant="secondary">Office Manager</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground">Loading supervisors...</p>
          ) : (supervisors as Supervisor[]).length === 0 ? (
            <p className="text-muted-foreground">No supervisors found.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Assigned Sites</TableHead>
                  <TableHead>Wage Visibility</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(supervisors as Supervisor[]).map((supervisor) => {
                  const unassignedSites = getUnassignedSites(supervisor);
                  const isEditing = editingSupervisor === supervisor.id;

                  return (
                    <TableRow key={supervisor.id}>
                      <TableCell className="font-medium">
                        {supervisor.full_name}
                      </TableCell>
                      <TableCell>{supervisor.email}</TableCell>
                      <TableCell>{supervisor.phone || "—"}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap items-center gap-2">
                          {supervisor.assignedSites.map((site) => (
                            <Badge
                              key={site.id}
                              variant="outline"
                              className="text-xs flex items-center gap-1 pr-1"
                            >
                              {site.name}
                              {/* Admin can remove sites */}
                              {isAdmin && (
                                <button
                                  onClick={() => handleRemoveSite(supervisor.id, site.id)}
                                  disabled={removeSite.isPending}
                                  className="ml-1 hover:bg-destructive/10 rounded-sm p-0.5 disabled:opacity-50"
                                  title="Remove site assignment"
                                >
                                  <X className="h-3 w-3 text-destructive" />
                                </button>
                              )}
                            </Badge>
                          ))}

                          {/* Admin can add new sites */}
                          {isAdmin && unassignedSites.length > 0 && (
                            <>
                              {isEditing ? (
                                <div className="flex items-center gap-2">
                                  <Select
                                    value={selectedSite}
                                    onValueChange={setSelectedSite}
                                  >
                                    <SelectTrigger className="w-[180px] h-7 text-xs">
                                      <SelectValue placeholder="Select site..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {unassignedSites.map((site) => (
                                        <SelectItem key={site.id} value={site.id}>
                                          {site.name}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                  <Button
                                    size="sm"
                                    className="h-7 px-2 text-xs"
                                    onClick={() => handleAddSite(supervisor.id)}
                                    disabled={!selectedSite || assignSite.isPending}
                                  >
                                    Assign
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 px-2 text-xs"
                                    onClick={() => {
                                      setEditingSupervisor(null);
                                      setSelectedSite("");
                                    }}
                                  >
                                    Cancel
                                  </Button>
                                </div>
                              ) : (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-7 px-2 text-xs"
                                  onClick={() => setEditingSupervisor(supervisor.id)}
                                >
                                  <Plus className="h-3 w-3 mr-1" />
                                  Add Site
                                </Button>
                              )}
                            </>
                          )}

                          {supervisor.assignedSites.length === 0 && !isEditing && (
                            <span className="text-muted-foreground text-sm">
                              None
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {/* Phase 3: Wage permission toggles per assigned site */}
                        {supervisor.assignedSites.length > 0 ? (
                          <div className="flex flex-col gap-2">
                            {supervisor.assignedSites.map((site) => {
                              const canView = canViewWagesForSite(supervisor, site.id);
                              return (
                                <div
                                  key={site.id}
                                  className="flex items-center justify-between gap-4 min-w-[200px]"
                                >
                                  <span className="text-sm truncate" title={site.name}>
                                    {site.name}
                                  </span>
                                  <Switch
                                    checked={canView}
                                    onCheckedChange={() =>
                                      handleToggleWagePermission(
                                        supervisor.id,
                                        site.id,
                                        canView
                                      )
                                    }
                                    disabled={updateWagePermission.isPending}
                                    aria-label={`Toggle wage visibility for ${site.name}`}
                                  />
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">
                            No sites assigned
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Mobile Cards */}
      <div className="md:hidden space-y-4">
        {loading ? (
          <p className="text-muted-foreground">Loading supervisors...</p>
        ) : (supervisors as Supervisor[]).length === 0 ? (
          <p className="text-muted-foreground">No supervisors found.</p>
        ) : (
          (supervisors as Supervisor[]).map((supervisor) => {
            const unassignedSites = getUnassignedSites(supervisor);
            const isEditing = editingSupervisor === supervisor.id;

            return (
              <Card key={supervisor.id}>
                <CardContent className="p-4 space-y-4">
                  {/* Name and Email */}
                  <div>
                    <h3 className="font-medium text-base">{supervisor.full_name}</h3>
                    <p className="text-sm text-muted-foreground">{supervisor.email}</p>
                    {supervisor.phone && (
                      <p className="text-sm text-muted-foreground">{supervisor.phone}</p>
                    )}
                  </div>

                  {/* Assigned Sites */}
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Assigned Sites</p>
                    <div className="flex flex-wrap gap-2">
                      {supervisor.assignedSites.map((site) => (
                        <Badge
                          key={site.id}
                          variant="outline"
                          className="text-xs flex items-center gap-1 pr-1"
                        >
                          {site.name}
                          {/* Admin can remove sites */}
                          {isAdmin && (
                            <button
                              onClick={() => handleRemoveSite(supervisor.id, site.id)}
                              disabled={removeSite.isPending}
                              className="ml-1 hover:bg-destructive/10 rounded-sm p-0.5 disabled:opacity-50"
                              title="Remove site assignment"
                            >
                              <X className="h-3 w-3 text-destructive" />
                            </button>
                          )}
                        </Badge>
                      ))}
                      {supervisor.assignedSites.length === 0 && (
                        <span className="text-muted-foreground text-sm">None</span>
                      )}
                    </div>
                  </div>

                  {/* Wage Visibility Toggles */}
                  {supervisor.assignedSites.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Wage Visibility</p>
                      <div className="space-y-2">
                        {supervisor.assignedSites.map((site) => {
                          const canView = canViewWagesForSite(supervisor, site.id);
                          return (
                            <div
                              key={site.id}
                              className="flex items-center justify-between gap-2"
                            >
                              <span className="text-sm truncate flex-1" title={site.name}>
                                {site.name}
                              </span>
                              <Switch
                                checked={canView}
                                onCheckedChange={() =>
                                  handleToggleWagePermission(
                                    supervisor.id,
                                    site.id,
                                    canView
                                  )
                                }
                                disabled={updateWagePermission.isPending}
                                aria-label={`Toggle wage visibility for ${site.name}`}
                              />
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Add Site Button - Full Width */}
                  {isAdmin && unassignedSites.length > 0 && (
                    <>
                      {isEditing ? (
                        <div className="space-y-2">
                          <Select
                            value={selectedSite}
                            onValueChange={setSelectedSite}
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Select site..." />
                            </SelectTrigger>
                            <SelectContent>
                              {unassignedSites.map((site) => (
                                <SelectItem key={site.id} value={site.id}>
                                  {site.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <div className="flex gap-2">
                            <Button
                              className="flex-1"
                              onClick={() => handleAddSite(supervisor.id)}
                              disabled={!selectedSite || assignSite.isPending}
                            >
                              Assign
                            </Button>
                            <Button
                              variant="ghost"
                              onClick={() => {
                                setEditingSupervisor(null);
                                setSelectedSite("");
                              }}
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <Button
                          variant="outline"
                          className="w-full"
                          onClick={() => setEditingSupervisor(supervisor.id)}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Add Site
                        </Button>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
