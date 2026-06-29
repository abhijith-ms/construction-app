import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { useLabour } from "@/hooks/useLabour";
import { useCreateLabour } from "@/hooks/useCreateLabour";
import { useUpdateLabour, useDeactivateLabour } from "@/hooks/useUpdateLabour";
import { useWagePermissions } from "@/hooks/useWagePermissions";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Loader2, Plus, Users, MoreHorizontal, Pencil, PowerOff, Power } from "lucide-react";
import type { TablesInsert } from "@/types/database";

const WORK_CATEGORIES = [
  "mason",
  "helper",
  "electrician",
  "painter",
  "carpenter",
  "plumber",
];

const labourSchema = z.object({
  full_name: z.string().min(1, "Full name is required"),
  phone: z.string().optional(),
  default_work_category: z.string().min(1, "Work category is required"),
  default_daily_rate: z.string().min(1, "Daily rate is required"),
});

type LabourFormData = z.infer<typeof labourSchema>;

// Format currency
function formatCurrency(amount: number | null) {
  if (amount === null || amount === undefined) return "N/A";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
  }).format(amount);
}

// Status badge component
function StatusBadge({ isActive }: { isActive: boolean }) {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${
        isActive
          ? "bg-green-100 text-green-700"
          : "bg-slate-100 text-slate-500"
      }`}
    >
      {isActive ? "Active" : "Inactive"}
    </span>
  );
}

export function Labour() {
  const { profile } = useAuthStore();
  const { data: labour, isLoading, error } = useLabour();
  const { mutate: createLabour, isPending: isCreating } = useCreateLabour();
  const { mutate: updateLabour, isPending: isUpdating } = useUpdateLabour();
  const { mutate: deactivateLabour } = useDeactivateLabour();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingLabour, setEditingLabour] = useState<Labour | null>(null);

  const { canViewWages } = useWagePermissions();
  const canManage = profile?.role === "admin" || profile?.role === "office_manager";
  // Use useWagePermissions hook which checks supervisor_wage_permissions table
  const canViewRates = canViewWages;

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<LabourFormData>({
    resolver: zodResolver(labourSchema),
  });

  const onSubmit = (data: LabourFormData) => {
    const rateValue = parseFloat(data.default_daily_rate);
    
    if (editingLabour) {
      // Update existing labour
      updateLabour(
        {
          id: editingLabour.id,
          updates: {
            full_name: data.full_name,
            phone: data.phone || null,
            default_work_category: data.default_work_category,
            default_daily_rate: rateValue,
          },
        },
        {
          onSuccess: () => {
            toast.success("Labour updated successfully");
            setIsDialogOpen(false);
            setEditingLabour(null);
            reset();
          },
          onError: (error) => {
            toast.error("Failed to update labour", {
              description: error.message,
            });
          },
        }
      );
    } else {
      // Create new labour
      const labourData: TablesInsert<"labour"> = {
        full_name: data.full_name,
        phone: data.phone || null,
        default_work_category: data.default_work_category,
        default_daily_rate: rateValue,
        is_active: true,
      };

      createLabour(labourData, {
        onSuccess: () => {
          toast.success("Labour created successfully");
          setIsDialogOpen(false);
          reset();
        },
        onError: (error) => {
          toast.error("Failed to create labour", {
            description: error.message,
          });
        },
      });
    }
  };

  const handleEdit = (labour: Labour) => {
    setEditingLabour(labour);
    setValue("full_name", labour.full_name);
    setValue("phone", labour.phone || "");
    setValue("default_work_category", labour.default_work_category);
    setValue("default_daily_rate", labour.default_daily_rate.toString());
    setIsDialogOpen(true);
  };

  const handleDeactivate = (id: string, currentStatus: boolean) => {
    if (currentStatus) {
      deactivateLabour(id);
    } else {
      // Reactivate
      updateLabour(
        {
          id,
          updates: { is_active: true },
        },
        {
          onSuccess: () => {
            toast.success("Labour reactivated successfully");
          },
          onError: (error) => {
            toast.error("Failed to reactivate labour", {
              description: error.message,
            });
          },
        }
      );
    }
  };

  const handleOpenDialog = () => {
    setEditingLabour(null);
    reset();
    setIsDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Labour</h1>
          <p className="text-slate-500 mt-1">
            Manage your daily-wage workers
          </p>
        </div>

        {canManage && (
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="flex items-center gap-2" onClick={handleOpenDialog}>
                <Plus className="h-4 w-4" />
                Add Labour
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>
                  {editingLabour ? "Edit Labour" : "Create New Labour"}
                </DialogTitle>
                <DialogDescription>
                  {editingLabour
                    ? "Update labour worker details"
                    : "Add a new daily-wage worker to the system"}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="full_name">Full Name *</Label>
                  <Input
                    id="full_name"
                    placeholder="e.g., Raju Kumar"
                    {...register("full_name")}
                  />
                  {errors.full_name && (
                    <p className="text-sm text-destructive">
                      {errors.full_name.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    placeholder="e.g., +91 98765 43210"
                    {...register("phone")}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="default_work_category">Work Category *</Label>
                  <select
                    id="default_work_category"
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                    {...register("default_work_category")}
                  >
                    <option value="">Select a category</option>
                    {WORK_CATEGORIES.map((category) => (
                      <option key={category} value={category}>
                        {category.charAt(0).toUpperCase() + category.slice(1)}
                      </option>
                    ))}
                  </select>
                  {errors.default_work_category && (
                    <p className="text-sm text-destructive">
                      {errors.default_work_category.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="default_daily_rate">Daily Rate (₹) *</Label>
                  <Input
                    id="default_daily_rate"
                    type="number"
                    placeholder="e.g., 1300"
                    {...register("default_daily_rate")}
                  />
                  {errors.default_daily_rate && (
                    <p className="text-sm text-destructive">
                      {errors.default_daily_rate.message}
                    </p>
                  )}
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsDialogOpen(false);
                      setEditingLabour(null);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isCreating || isUpdating}>
                    {(isCreating || isUpdating) ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      editingLabour ? "Update Labour" : "Create Labour"
                    )}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Labour Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Daily-Wage Workers
          </CardTitle>
          <CardDescription>
            {labour?.length || 0} workers found
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <p className="text-destructive">
                Error loading labour: {error.message}
              </p>
            </div>
          ) : labour?.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-slate-500">No workers found</p>
              {canManage && (
                <p className="text-sm text-slate-400 mt-1">
                  Click "Add Labour" to create your first worker
                </p>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-semibold text-slate-700">
                      Name
                    </th>
                    <th className="text-left py-3 px-4 font-semibold text-slate-700">
                      Category
                    </th>
                    <th className="text-left py-3 px-4 font-semibold text-slate-700">
                      Phone
                    </th>
                    {canViewRates && (
                      <th className="text-right py-3 px-4 font-semibold text-slate-700">
                        Daily Rate
                      </th>
                    )}
                    <th className="text-left py-3 px-4 font-semibold text-slate-700">
                      Status
                    </th>
                    {canManage && (
                      <th className="text-right py-3 px-4 font-semibold text-slate-700">
                        Actions
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {labour?.map((worker) => (
                    <tr key={worker.id} className="hover:bg-slate-50">
                      <td className="py-3 px-4">
                        <div className="font-medium">{worker.full_name}</div>
                      </td>
                      <td className="py-3 px-4 capitalize">
                        {worker.default_work_category}
                      </td>
                      <td className="py-3 px-4 text-sm">
                        {worker.phone || "N/A"}
                      </td>
                      {canViewRates && (
                        <td className="py-3 px-4 text-right font-mono">
                          {formatCurrency(worker.default_daily_rate)}
                        </td>
                      )}
                      <td className="py-3 px-4">
                        <StatusBadge isActive={worker.is_active} />
                      </td>
                      {canManage && (
                        <td className="py-3 px-4 text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                              >
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleEdit(worker)}>
                                <Pencil className="h-4 w-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() =>
                                  handleDeactivate(worker.id, worker.is_active)
                                }
                              >
                                {worker.is_active ? (
                                  <>
                                    <PowerOff className="h-4 w-4 mr-2" />
                                    Deactivate
                                  </>
                                ) : (
                                  <>
                                    <Power className="h-4 w-4 mr-2" />
                                    Reactivate
                                  </>
                                )}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Type import for Labour
import type { Labour as LabourType } from "@/hooks/useLabour";
type Labour = LabourType;
