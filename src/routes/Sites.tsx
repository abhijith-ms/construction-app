import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { useSites } from "@/hooks/useSites";
import { useCreateSite } from "@/hooks/useCreateSite";
import { useAuthStore } from "@/stores/authStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Loader2, Plus, Building2, LayoutDashboard } from "lucide-react";
import type { TablesInsert } from "@/types/database";

const siteSchema = z.object({
  name: z.string().min(1, "Site name is required"),
  client_name: z.string().min(1, "Client name is required"),
  client_phone: z.string().optional(),
  budget: z.string().optional(),
  start_date: z.string().optional(),
});

type SiteFormData = z.infer<typeof siteSchema>;

// Status badge component
function StatusBadge({ status }: { status: string | null }) {
  const statusStyles: Record<string, string> = {
    active: "bg-green-100 text-green-700",
    on_hold: "bg-amber-100 text-amber-700",
    completed: "bg-slate-100 text-slate-700",
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${
        statusStyles[status || "active"] || "bg-slate-100 text-slate-700"
      }`}
    >
      {status || "active"}
    </span>
  );
}

// Format currency
function formatCurrency(amount: number | null) {
  if (amount === null || amount === undefined) return "N/A";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
  }).format(amount);
}

// Format date
function formatDate(dateStr: string | null) {
  if (!dateStr) return "N/A";
  return new Date(dateStr).toLocaleDateString("en-IN");
}

export function Sites() {
  const navigate = useNavigate();
  const { profile } = useAuthStore();
  const { data: sites, isLoading, error } = useSites();
  const { mutate: createSite, isPending: isCreating } = useCreateSite();
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const canViewDashboard = profile?.role === "admin" || profile?.role === "office_manager";

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<SiteFormData>({
    resolver: zodResolver(siteSchema),
  });

  const onSubmit = (data: SiteFormData) => {
    const budgetValue = data.budget ? parseFloat(data.budget) : null;
    const siteData: TablesInsert<"sites"> = {
      name: data.name,
      client_name: data.client_name,
      client_phone: data.client_phone || null,
      budget: budgetValue,
      start_date: data.start_date || null,
      status: "active",
    };

    createSite(siteData, {
      onSuccess: () => {
        toast.success("Site created successfully");
        setIsDialogOpen(false);
        reset();
      },
      onError: (error) => {
        // Display actual RLS error
        toast.error("Failed to create site", {
          description: error.message,
        });
      },
    });
  };

  const canCreate = profile?.role === "admin" || profile?.role === "office_manager";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Sites</h1>
          <p className="text-slate-500 mt-1">
            Manage your construction sites
          </p>
        </div>

        {canCreate && (
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="flex items-center gap-2 w-full sm:w-auto min-h-11">
                <Plus className="h-4 w-4" />
                Add Site
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Create New Site</DialogTitle>
                <DialogDescription>
                  Add a new construction site to the system
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Site Name *</Label>
                  <Input
                    id="name"
                    placeholder="e.g., Downtown Office Complex"
                    {...register("name")}
                  />
                  {errors.name && (
                    <p className="text-sm text-destructive">{errors.name.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="client_name">Client Name *</Label>
                  <Input
                    id="client_name"
                    placeholder="e.g., ABC Corporation"
                    {...register("client_name")}
                  />
                  {errors.client_name && (
                    <p className="text-sm text-destructive">
                      {errors.client_name.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="client_phone">Client Phone</Label>
                  <Input
                    id="client_phone"
                    placeholder="e.g., +91 98765 43210"
                    {...register("client_phone")}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="budget">Budget (₹)</Label>
                    <Input
                      id="budget"
                      type="number"
                      placeholder="e.g., 5000000"
                      {...register("budget")}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="start_date">Start Date</Label>
                    <Input id="start_date" type="date" {...register("start_date")} />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isCreating}>
                    {isCreating ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      "Create Site"
                    )}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Sites Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Construction Sites
          </CardTitle>
          <CardDescription>
            {sites?.length || 0} sites found
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <p className="text-destructive">Error loading sites: {error.message}</p>
            </div>
          ) : sites?.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-slate-500">No sites found</p>
              {canCreate && (
                <p className="text-sm text-slate-400 mt-1">
                  Click "Add Site" to create your first site
                </p>
              )}
            </div>
          ) : (
            <>
              {/* Mobile Cards View */}
              <div className="md:hidden space-y-3">
                {sites?.map((site) => (
                  <Card key={site.id} className="min-h-11">
                    <CardContent className="p-4 space-y-2">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="font-medium text-slate-900 min-h-11 flex items-center">
                            {site.name}
                          </div>
                          <div className="text-sm text-slate-500">
                            {site.client_name || "N/A"}
                          </div>
                          {site.client_phone && (
                            <div className="text-sm text-slate-500">
                              {site.client_phone}
                            </div>
                          )}
                        </div>
                        <StatusBadge status={site.status} />
                      </div>
                      <div className="flex items-center justify-between pt-2 border-t">
                        <span className="text-sm text-slate-500">Budget</span>
                        <span className="font-mono font-medium">
                          {formatCurrency(site.budget)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-500">Start Date</span>
                        <span className="text-sm">{formatDate(site.start_date)}</span>
                      </div>
                      {canViewDashboard && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full mt-2"
                          onClick={() => navigate(`/sites/${site.id}/dashboard`)}
                        >
                          <LayoutDashboard className="h-4 w-4 mr-2" />
                          View Dashboard
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4 font-semibold text-slate-700">
                        Site Name
                      </th>
                      <th className="text-left py-3 px-4 font-semibold text-slate-700">
                        Client
                      </th>
                      <th className="text-left py-3 px-4 font-semibold text-slate-700">
                        Status
                      </th>
                      <th className="text-right py-3 px-4 font-semibold text-slate-700">
                        Budget
                      </th>
                      <th className="text-left py-3 px-4 font-semibold text-slate-700">
                        Start Date
                      </th>
                      {canViewDashboard && (
                        <th className="text-left py-3 px-4 font-semibold text-slate-700">
                          Actions
                        </th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {sites?.map((site) => (
                      <tr key={site.id} className="hover:bg-slate-50">
                        <td className="py-3 px-4">
                          <div className="font-medium">{site.name}</div>
                        </td>
                        <td className="py-3 px-4">
                          <div>{site.client_name || "N/A"}</div>
                          {site.client_phone && (
                            <div className="text-sm text-slate-500">
                              {site.client_phone}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <StatusBadge status={site.status} />
                        </td>
                        <td className="py-3 px-4 text-right font-mono">
                          {formatCurrency(site.budget)}
                        </td>
                        <td className="py-3 px-4 text-sm">
                          {formatDate(site.start_date)}
                        </td>
                        {canViewDashboard && (
                          <td className="py-3 px-4">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => navigate(`/sites/${site.id}/dashboard`)}
                            >
                              <LayoutDashboard className="h-4 w-4 mr-2" />
                              Dashboard
                            </Button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
