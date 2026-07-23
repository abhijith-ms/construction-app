import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { format } from "date-fns";
import { useLabourPool } from "@/hooks/useLabourPool";
import { useWorkCategories, getCategoryOptions } from "@/hooks/useWorkCategories";
import { useCreateLabour } from "@/hooks/useCreateLabour";
import { useUpdateLabour, useDeactivateLabour } from "@/hooks/useUpdateLabour";
import { useWagePermissions } from "@/hooks/useWagePermissions";
import { useLabourAdvances } from "@/hooks/useLabourAdvances";
import { useCreateLabourAdvance } from "@/hooks/useCreateLabourAdvance";
import { useSites } from "@/hooks/useSites";
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
import { Loader2, Plus, Users, MoreHorizontal, Pencil, PowerOff, Power, IndianRupee, Wallet, MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useLabourSiteAssignments } from "@/hooks/useLabourSiteAssignments";
import { useCreateLabourSiteAssignment } from "@/hooks/useCreateLabourSiteAssignment";
import { useEndLabourSiteAssignment } from "@/hooks/useEndLabourSiteAssignment";
import type { LabourSiteAssignment } from "@/hooks/useLabourSiteAssignments";
import type { Labour as LabourType } from "@/hooks/useLabour";
import type { LabourAdvanceWithDetails } from "@/hooks/useLabourAdvances";

type Labour = LabourType;

const labourSchema = z.object({
  full_name: z.string().min(1, "Full name is required"),
  phone: z.string().optional(),
  default_work_category: z.string().min(1, "Work category is required"),
  default_daily_rate: z.string().min(1, "Daily rate is required"),
  // Optional rate fields for half-day and overtime
  half_day_rate: z.string().optional().nullable().refine((val) => {
    if (!val) return true;
    return parseFloat(val) > 0;
  }, "Half day rate must be greater than 0"),
  overtime_rate: z.string().optional().nullable().refine((val) => {
    if (!val) return true;
    return parseFloat(val) > 0;
  }, "Overtime rate must be greater than 0"),
  // Optional site assignment fields
  assign_to_site: z.boolean().optional(),
  site_id: z.string().optional(),
  task_category: z.string().optional(),
  daily_rate: z.string().optional(),
  start_date: z.string().optional(),
});

type LabourFormData = z.infer<typeof labourSchema>;

// Zod schema for assignment form
const assignmentSchema = z.object({
  site_id: z.string().min(1, "Site is required"),
  task_category: z.string().min(1, "Task category is required"),
  daily_rate: z.string().min(1, "Daily rate is required").refine((val) => parseFloat(val) > 0, "Daily rate must be greater than 0"),
  start_date: z.string().min(1, "Start date is required"),
  notes: z.string().optional(),
});

type AssignmentFormData = z.infer<typeof assignmentSchema>;

// Zod schema for advance form
const advanceSchema = z.object({
  site_id: z.string().min(1, "Site is required"),
  amount: z.string().min(1, "Amount is required").refine((val) => parseFloat(val) > 0, "Amount must be greater than 0"),
  date_given: z.string().min(1, "Date is required"),
  notes: z.string().optional(),
});

type AdvanceFormData = z.infer<typeof advanceSchema>;

// Format currency
function formatCurrency(amount: number | null) {
  if (amount === null || amount === undefined) return "N/A";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
  }).format(amount);
}

export function Labour() {
  const { profile } = useAuthStore();
  const { data: labour, isLoading, error } = useLabourPool();
  const { data: workCategories } = useWorkCategories();
  const { mutate: createLabour, isPending: isCreating } = useCreateLabour();
  const { mutate: updateLabour, isPending: isUpdating } = useUpdateLabour();
  const { mutate: deactivateLabour } = useDeactivateLabour();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingLabour, setEditingLabour] = useState<Labour | null>(null);
  const [advanceWorker, setAdvanceWorker] = useState<Labour | null>(null);
  const [isAdvanceOpen, setIsAdvanceOpen] = useState(false);
  const [assignmentWorker, setAssignmentWorker] = useState<Labour | null>(null);
  const [isAssignmentOpen, setIsAssignmentOpen] = useState(false);

  const { canViewWages } = useWagePermissions();
  const canManage = profile?.role === "admin" || profile?.role === "office_manager";
  const canViewRates = canViewWages;

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<LabourFormData>({
    resolver: zodResolver(labourSchema),
    defaultValues: {
      full_name: "",
      phone: "",
      default_work_category: "",
      default_daily_rate: "",
      assign_to_site: false,
      site_id: "",
      task_category: "",
      daily_rate: "",
      start_date: new Date().toISOString().split("T")[0],
    },
  });

  const assignToSite = watch("assign_to_site");
  const defaultWorkCategory = watch("default_work_category");
  const defaultDailyRate = watch("default_daily_rate");
  const { mutate: createAssignment } = useCreateLabourSiteAssignment();
  const { data: sites } = useSites();

  const onSubmit = (data: LabourFormData) => {
    const rateValue = parseFloat(data.default_daily_rate);
    const halfDayRateValue = data.half_day_rate ? parseFloat(data.half_day_rate) : null;
    const overtimeRateValue = data.overtime_rate ? parseFloat(data.overtime_rate) : null;
    
    if (editingLabour) {
      updateLabour(
        {
          id: editingLabour.id,
          updates: {
            full_name: data.full_name,
            phone: data.phone || null,
            default_work_category: data.default_work_category,
            default_daily_rate: rateValue,
            half_day_rate: halfDayRateValue,
            overtime_rate: overtimeRateValue,
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
      createLabour(
        {
          full_name: data.full_name,
          phone: data.phone || null,
          default_work_category: data.default_work_category,
          default_daily_rate: rateValue,
        },
        {
          onSuccess: (newLabour) => {
            toast.success("Labour created successfully");
            
            // If assignment is requested and we have the new labour's ID
            if (data.assign_to_site && data.site_id && newLabour?.id && profile?.id) {
              createAssignment(
                {
                  labour_id: newLabour.id,
                  site_id: data.site_id,
                  task_category: data.task_category || data.default_work_category,
                  daily_rate: parseFloat(data.daily_rate || data.default_daily_rate),
                  start_date: data.start_date || new Date().toISOString().split("T")[0],
                  assigned_by: profile.id,
                },
                {
                  onSuccess: () => {
                    toast.success("Site assignment created successfully");
                  },
                  onError: (error) => {
                    toast.warning("Worker created but site assignment failed", {
                      description: error.message + " — please assign manually from Labour page",
                    });
                  },
                }
              );
            }
            
            setIsDialogOpen(false);
            reset();
          },
          onError: (error) => {
            toast.error("Failed to create labour", {
              description: error.message,
            });
          },
        }
      );
    }
  };

  const handleEdit = (worker: Labour) => {
    setEditingLabour(worker);
    setValue("full_name", worker.full_name);
    setValue("phone", worker.phone || "");
    setValue("default_work_category", worker.default_work_category);
    setValue("default_daily_rate", worker.default_daily_rate.toString());
    setValue("half_day_rate", worker.half_day_rate?.toString() || "");
    setValue("overtime_rate", worker.overtime_rate?.toString() || "");
    setIsDialogOpen(true);
  };

  const handleDeactivate = (id: string, currentStatus: boolean) => {
    if (currentStatus) {
      deactivateLabour(id, {
        onSuccess: () => {
          toast.success("Labour deactivated");
        },
        onError: (error) => {
          toast.error("Failed to deactivate labour", {
            description: error.message,
          });
        },
      });
    } else {
      updateLabour(
        {
          id,
          updates: { is_active: true },
        },
        {
          onSuccess: () => {
            toast.success("Labour reactivated");
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
    reset({
      full_name: "",
      phone: "",
      default_work_category: "",
      default_daily_rate: "",
    });
    setIsDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Workers</h1>
          <p className="text-slate-500 mt-1">
            Manage construction workers and their default rates
          </p>
        </div>
        {canManage && (
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="flex items-center gap-2 w-full sm:w-auto" onClick={handleOpenDialog}>
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
                    ? "Update worker details below"
                    : "Add a new worker to the system"}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="full_name">Full Name *</Label>
                  <Input
                    id="full_name"
                    placeholder="e.g., Rajesh Kumar"
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
                    type="tel"
                    placeholder="e.g., 9876543210"
                    {...register("phone")}
                  />
                  {errors.phone && (
                    <p className="text-sm text-destructive">
                      {errors.phone.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="default_work_category">Work Category *</Label>
                  <select
                    id="default_work_category"
                    className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                    {...register("default_work_category")}
                  >
                    <option value="">Select category...</option>
                    {getCategoryOptions(
                      workCategories,
                      editingLabour?.default_work_category
                    ).map((option) => (
                      <option key={option.name} value={option.name}>
                        {option.retired ? `${option.name} (retired)` : option.name}
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

                {/* Half Day Rate and Overtime Rate - Only when editing */
                  editingLabour && (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="half_day_rate">Half Day Rate (₹)</Label>
                        <Input
                          id="half_day_rate"
                          type="number"
                          step="0.01"
                          placeholder="e.g., 650"
                          {...register("half_day_rate")}
                        />
                        <p className="text-xs text-muted-foreground">
                          If not set, site's half-day multiplier will be used
                        </p>
                        {errors.half_day_rate && (
                          <p className="text-sm text-destructive">
                            {errors.half_day_rate.message}
                          </p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="overtime_rate">Overtime Rate (₹/hr)</Label>
                        <Input
                          id="overtime_rate"
                          type="number"
                          step="0.01"
                          placeholder="e.g., 150"
                          {...register("overtime_rate")}
                        />
                        <p className="text-xs text-muted-foreground">
                          Hourly rate for overtime hours. Leave blank if worker is not eligible for overtime.
                        </p>
                        {errors.overtime_rate && (
                          <p className="text-sm text-destructive">
                            {errors.overtime_rate.message}
                          </p>
                        )}
                      </div>
                    </>
                  )
                }

                {/* Optional Site Assignment - Only for Admin creating new labour (not editing) */}
                {!editingLabour && profile?.role === "admin" && (
                  <div className="border-t border-slate-200 pt-4 mt-4">
                    <div className="flex items-center gap-3 mb-4">
                      <input
                        type="checkbox"
                        id="assign_to_site"
                        {...register("assign_to_site")}
                        className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
                      />
                      <Label htmlFor="assign_to_site" className="text-sm font-medium text-slate-900 cursor-pointer">
                        Assign to a site now
                      </Label>
                    </div>

                    {assignToSite && (
                      <div className="space-y-4 bg-slate-50 p-4 rounded-lg border border-slate-200">
                        <div className="space-y-2">
                          <Label htmlFor="site_id" className="text-sm font-medium text-slate-900">
                            Site <span className="text-red-500">*</span>
                          </Label>
                          <select
                            id="site_id"
                            className="w-full h-10 px-3 rounded-md border border-slate-300 bg-white text-sm text-slate-900"
                            {...register("site_id", { required: assignToSite })}
                          >
                            <option value="">Select site...</option>
                            {sites?.map((site) => (
                              <option key={site.id} value={site.id}>
                                {site.name}
                              </option>
                            ))}
                          </select>
                          {errors.site_id && (
                            <p className="text-sm text-red-500">{errors.site_id.message}</p>
                          )}
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="task_category" className="text-sm font-medium text-slate-900">
                            Task Category <span className="text-red-500">*</span>
                          </Label>
                          <select
                            id="task_category"
                            className="w-full h-10 px-3 rounded-md border border-slate-300 bg-white text-sm text-slate-900"
                            {...register("task_category")}
                            defaultValue={defaultWorkCategory || ""}
                          >
                            <option value="">Select category...</option>
                            {getCategoryOptions(workCategories).map((option) => (
                              <option key={option.name} value={option.name}>
                                {option.name.charAt(0).toUpperCase() + option.name.slice(1)}
                              </option>
                            ))}
                          </select>
                          {errors.task_category && (
                            <p className="text-sm text-red-500">{errors.task_category.message}</p>
                          )}
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="daily_rate" className="text-sm font-medium text-slate-900">
                            Daily Rate (₹) <span className="text-red-500">*</span>
                          </Label>
                          <Input
                            id="daily_rate"
                            type="number"
                            placeholder="e.g., 1300"
                            {...register("daily_rate")}
                            defaultValue={defaultDailyRate || ""}
                            className="text-slate-900"
                          />
                          {errors.daily_rate && (
                            <p className="text-sm text-red-500">{errors.daily_rate.message}</p>
                          )}
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="start_date" className="text-sm font-medium text-slate-900">
                            Start Date
                          </Label>
                          <Input
                            id="start_date"
                            type="date"
                            {...register("start_date")}
                            defaultValue={new Date().toISOString().split("T")[0]}
                            className="text-slate-900"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div className="flex justify-end gap-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsDialogOpen(false);
                      setEditingLabour(null);
                      reset();
                    }}
                    disabled={isCreating || isUpdating}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isCreating || isUpdating}>
                    {isCreating || isUpdating ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : null}
                    {editingLabour ? "Update" : "Create"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-500 flex items-center gap-2">
              <Users className="h-4 w-4" />
              Total Workers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{labour?.length || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-500">
              Active Workers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {labour?.filter((w) => w.is_active).length || 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-500">
              Inactive Workers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-400">
              {labour?.filter((w) => !w.is_active).length || 0}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Workers List */}
      <Card>
        <CardHeader>
          <CardTitle>All Workers</CardTitle>
          <CardDescription>
            {canManage 
              ? "View and manage all workers" 
              : "View worker information"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
            </div>
          ) : error ? (
            <div className="text-center py-8 text-destructive">
              Error loading workers. Please try again.
            </div>
          ) : labour?.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              No workers found. {canManage && "Add your first worker above."}
            </div>
          ) : (
            <>
              {/* Mobile Cards */}
              <div className="md:hidden space-y-3">
                {labour?.map((worker) => (
                  <Card
                    key={worker.id}
                    className="cursor-pointer hover:bg-slate-50 transition-colors"
                    onClick={() => canManage && handleEdit(worker)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-semibold text-base truncate">
                              {worker.full_name}
                            </h3>
                            <Badge variant={worker.is_active ? "default" : "secondary"}>
                              {worker.is_active ? "Active" : "Inactive"}
                            </Badge>
                          </div>
                          <div className="mt-2 space-y-1">
                            <p className="text-sm text-slate-600 capitalize">
                              {worker.default_work_category}
                            </p>
                            {canViewRates && (
                              <p className="text-sm font-mono flex items-center gap-1">
                                <IndianRupee className="h-3.5 w-3.5" />
                                {worker.default_daily_rate.toLocaleString("en-IN")}/day
                              </p>
                            )}
                            {worker.phone && (
                              <p className="text-sm text-slate-500">
                                {worker.phone}
                              </p>
                            )}
                            {/* Active Sites Badge */}
                            <div className="flex flex-wrap gap-1 mt-1">
                              {worker.activeSiteCount === 0 ? (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-slate-100 text-slate-500">
                                  Unassigned
                                </span>
                              ) : worker.activeSiteCount > 1 ? (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-orange-100 text-orange-800">
                                  Multi-site
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-blue-50 text-blue-700">
                                  {worker.activeSites[0]?.name}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        {canManage && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-11 w-11 shrink-0"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <MoreHorizontal className="h-5 w-5" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleEdit(worker)}>
                                <Pencil className="h-4 w-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setAssignmentWorker(worker);
                                  setIsAssignmentOpen(true);
                                }}
                              >
                                <MapPin className="h-4 w-4 mr-2" />
                                Assignments
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setAdvanceWorker(worker);
                                  setIsAdvanceOpen(true);
                                }}
                              >
                                <Wallet className="h-4 w-4 mr-2" />
                                Advances
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
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Desktop Table */}
              <div className="hidden md:block overflow-x-auto">
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
                      <th className="text-left py-3 px-4 font-semibold text-slate-700">
                        Active Sites
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
                          <div className="flex flex-wrap gap-1">
                            {worker.activeSiteCount === 0 ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-slate-100 text-slate-500">
                                Unassigned
                              </span>
                            ) : worker.activeSiteCount > 1 ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-orange-100 text-orange-800">
                                Multi-site
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-blue-50 text-blue-700">
                                {worker.activeSites[0]?.name}
                              </span>
                            )}
                          </div>
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
                                  onClick={() => {
                                    setAssignmentWorker(worker);
                                    setIsAssignmentOpen(true);
                                  }}
                                >
                                  <MapPin className="h-4 w-4 mr-2" />
                                  Assignments
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => {
                                    setAdvanceWorker(worker);
                                    setIsAdvanceOpen(true);
                                  }}
                                >
                                  <Wallet className="h-4 w-4 mr-2" />
                                  Advances
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
            </>
          )}
        </CardContent>
      </Card>

      {/* Assignments Sheet/Dialog */}
      <AssignmentSheet
        worker={assignmentWorker}
        isOpen={isAssignmentOpen}
        onOpenChange={setIsAssignmentOpen}
        canViewRates={canViewRates}
      />

      {/* Advances Sheet/Dialog */}
      <AdvanceSheet
        worker={advanceWorker}
        isOpen={isAdvanceOpen}
        onOpenChange={setIsAdvanceOpen}
      />
    </div>
  );
}

// Assignment Sheet/Dialog Component
function AssignmentSheet({
  worker,
  isOpen,
  onOpenChange,
  canViewRates,
}: {
  worker: Labour | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  canViewRates: boolean;
}) {
  const { profile } = useAuthStore();
  const { data: sites } = useSites();
  const { data: workCategories } = useWorkCategories();
  const { data: assignments, isLoading, refetch } = useLabourSiteAssignments(worker?.id || null);
  const { mutate: createAssignment, isPending: isCreating } = useCreateLabourSiteAssignment();
  const { mutate: endAssignment, isPending: isEnding } = useEndLabourSiteAssignment();
  const [showAddForm, setShowAddForm] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm<AssignmentFormData>({
    resolver: zodResolver(assignmentSchema),
    defaultValues: {
      start_date: new Date().toISOString().split("T")[0],
      daily_rate: "",
      site_id: "",
      task_category: "",
      notes: "",
    },
  });

  const onSubmit = (data: AssignmentFormData) => {
    if (!worker || !profile?.id) return;

    createAssignment(
      {
        labour_id: worker.id,
        site_id: data.site_id,
        task_category: data.task_category,
        daily_rate: parseFloat(data.daily_rate),
        start_date: data.start_date,
        notes: data.notes || undefined,
        assigned_by: profile.id,
      },
      {
        onSuccess: () => {
          toast.success("Assignment created successfully");
          setShowAddForm(false);
          reset();
          refetch();
        },
        onError: (error) => {
          toast.error("Failed to create assignment", {
            description: error.message,
          });
        },
      }
    );
  };

  const handleEndAssignment = (assignment: LabourSiteAssignment) => {
    if (!profile?.id) return;
    const today = new Date().toISOString().split("T")[0];
    endAssignment(
      {
        assignmentId: assignment.id,
        labourId: assignment.labour_id,
        siteId: assignment.site_id,
        endDate: today,
        actorId: profile.id,
      },
      {
        onSuccess: () => {
          toast.success("Assignment ended successfully");
          refetch();
        },
        onError: (error) => {
          toast.error("Failed to end assignment", {
            description: error.message,
          });
        },
      }
    );
  };

  const isActive = (assignment: LabourSiteAssignment) => {
    if (!assignment.end_date) return true;
    const today = new Date().toISOString().split("T")[0];
    return assignment.end_date > today;
  };

  const renderContent = (isDesktop: boolean) => (
    <>
      {showAddForm ? (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label className="text-sm font-medium text-slate-900">Site *</Label>
            <Controller
              name="site_id"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select site..." />
                  </SelectTrigger>
                  <SelectContent>
                    {sites?.map((site) => (
                      <SelectItem key={site.id} value={site.id}>
                        {site.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.site_id && (
              <p className="text-sm text-red-500">{errors.site_id.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium text-slate-900">Task Category *</Label>
            <Controller
              name="task_category"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select category..." />
                  </SelectTrigger>
                  <SelectContent>
                    {getCategoryOptions(workCategories).map((option) => (
                      <SelectItem key={option.name} value={option.name}>
                        {option.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.task_category && (
              <p className="text-sm text-red-500">{errors.task_category.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="daily_rate" className="text-sm font-medium text-slate-900">Daily Rate (₹) *</Label>
            <Input
              id="daily_rate"
              type="number"
              placeholder="e.g., 1300"
              {...register("daily_rate")}
            />
            {errors.daily_rate && (
              <p className="text-sm text-red-500">{errors.daily_rate.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="start_date" className="text-sm font-medium text-slate-900">Start Date *</Label>
            <Input
              id="start_date"
              type="date"
              {...register("start_date")}
            />
            {errors.start_date && (
              <p className="text-sm text-red-500">{errors.start_date.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes" className="text-sm font-medium text-slate-900">Notes</Label>
            <Input
              id="notes"
              placeholder="Optional notes..."
              {...register("notes")}
            />
          </div>

          <div className={`flex gap-2 pt-2 ${isDesktop ? "justify-end" : ""}`}>
            <Button type="button" variant="outline" className={isDesktop ? "" : "flex-1"} onClick={() => setShowAddForm(false)}>
              Cancel
            </Button>
            <Button type="submit" className={isDesktop ? "" : "flex-1"} disabled={isCreating}>
              {isCreating && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Save
            </Button>
          </div>
        </form>
      ) : (
        <>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
            </div>
          ) : assignments?.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              No site assignments yet.
            </div>
          ) : (
            <div className="space-y-3">
              {assignments?.map((assignment: LabourSiteAssignment) => (
                <div key={assignment.id} className="border rounded-lg p-3">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="font-medium">{assignment.site_name}</div>
                      <div className="text-sm text-slate-500 capitalize">{assignment.task_category}</div>
                      {canViewRates && (
                        <div className="text-sm font-mono flex items-center gap-1 mt-1">
                          <IndianRupee className="h-3 w-3" />
                          {assignment.daily_rate.toLocaleString("en-IN")}/day
                        </div>
                      )}
                      <div className="text-xs text-slate-400 mt-1">
                        Started: {format(new Date(assignment.start_date), "dd MMM yyyy")}
                      </div>
                      {assignment.end_date && (
                        <div className="text-xs text-slate-400">
                          Ended: {format(new Date(assignment.end_date), "dd MMM yyyy")}
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      {isActive(assignment) ? (
                        <Badge className="bg-green-100 text-green-800">Active</Badge>
                      ) : (
                        <Badge variant="secondary">Ended</Badge>
                      )}
                      {isActive(assignment) && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEndAssignment(assignment)}
                          disabled={isEnding}
                        >
                          {isEnding && <Loader2 className="h-3 w-3 animate-spin mr-1" />}
                          End
                        </Button>
                      )}
                    </div>
                  </div>
                  {assignment.notes && (
                    <div className="text-sm text-slate-600 mt-2">{assignment.notes}</div>
                  )}
                </div>
              ))}
            </div>
          )}
          <Button className={isDesktop ? "w-fit" : "w-full"} onClick={() => setShowAddForm(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Assignment
          </Button>
        </>
      )}
    </>
  );

  return (
    <>
      {/* Mobile Sheet */}
      <div className="md:hidden">
        <Sheet open={isOpen} onOpenChange={onOpenChange}>
          <SheetContent side="bottom" className="h-[85vh]">
            <SheetHeader>
              <SheetTitle>Site Assignments - {worker?.full_name}</SheetTitle>
              <SheetDescription>
                Manage site assignments and rates
              </SheetDescription>
            </SheetHeader>
            <div className="mt-6 space-y-4">
              {renderContent(false)}
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* Desktop Dialog */}
      <div className="hidden md:block">
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
          <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Site Assignments - {worker?.full_name}</DialogTitle>
              <DialogDescription>
                Manage site assignments and rates
              </DialogDescription>
            </DialogHeader>
            <div className="mt-4 space-y-4">
              {renderContent(true)}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </>
  );
}

// Advance Sheet/Dialog Component
function AdvanceSheet({
  worker,
  isOpen,
  onOpenChange,
}: {
  worker: Labour | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { data: sites } = useSites();
  const { data: advances, isLoading } = useLabourAdvances(worker?.id || null);
  const { mutate: createAdvance, isPending: isCreating } = useCreateLabourAdvance();
  const [showAddForm, setShowAddForm] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm<AdvanceFormData>({
    resolver: zodResolver(advanceSchema),
    defaultValues: {
      date_given: new Date().toISOString().split("T")[0],
      amount: "",
      site_id: "",
      notes: "",
    },
  });

  const onSubmit = (data: AdvanceFormData) => {
    if (!worker) return;

    createAdvance(
      {
        labour_id: worker.id,
        site_id: data.site_id,
        amount: parseFloat(data.amount),
        date_given: data.date_given,
        notes: data.notes || undefined,
      },
      {
        onSuccess: () => {
          toast.success("Advance recorded successfully");
          setShowAddForm(false);
          reset();
        },
        onError: (error) => {
          toast.error("Failed to record advance", {
            description: error.message,
          });
        },
      }
    );
  };

  const totalUnsettled = advances?.reduce((sum, adv) => sum + (adv.settlement_id ? 0 : Number(adv.amount)), 0) || 0;

  const renderContent = (isDesktop: boolean) => (
    <>
      {showAddForm ? (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label className="text-sm font-medium text-slate-900">Site *</Label>
            <Controller
              name="site_id"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select site..." />
                  </SelectTrigger>
                  <SelectContent>
                    {sites?.map((site) => (
                      <SelectItem key={site.id} value={site.id}>
                        {site.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.site_id && (
              <p className="text-sm text-red-500">{errors.site_id.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount" className="text-sm font-medium text-slate-900">Amount (₹) *</Label>
            <Input
              id="amount"
              type="number"
              placeholder="e.g., 2000"
              {...register("amount")}
            />
            {errors.amount && (
              <p className="text-sm text-red-500">{errors.amount.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="date_given" className="text-sm font-medium text-slate-900">Date *</Label>
            <Input
              id="date_given"
              type="date"
              {...register("date_given")}
            />
            {errors.date_given && (
              <p className="text-sm text-red-500">{errors.date_given.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes" className="text-sm font-medium text-slate-900">Notes</Label>
            <Input
              id="notes"
              placeholder="Optional notes..."
              {...register("notes")}
            />
          </div>

          <div className={`flex gap-2 pt-2 ${isDesktop ? "justify-end" : ""}`}>
            <Button type="button" variant="outline" className={isDesktop ? "" : "flex-1"} onClick={() => setShowAddForm(false)}>
              Cancel
            </Button>
            <Button type="submit" className={isDesktop ? "" : "flex-1"} disabled={isCreating}>
              {isCreating && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Save
            </Button>
          </div>
        </form>
      ) : (
        <>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
            </div>
          ) : advances?.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              No advances recorded yet.
            </div>
          ) : (
            <div className="space-y-3">
              {advances?.map((advance: LabourAdvanceWithDetails) => (
                <div key={advance.id} className="border rounded-lg p-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-medium">{formatCurrency(Number(advance.amount))}</div>
                      <div className="text-sm text-slate-500">{advance.sites?.name}</div>
                      <div className="text-sm text-slate-500">{new Date(advance.date_given).toLocaleDateString("en-IN")}</div>
                    </div>
                    <Badge variant={advance.settlement_id ? "secondary" : "outline"}>
                      {advance.settlement_id ? "Settled" : "Unsettled"}
                    </Badge>
                  </div>
                  {advance.notes && (
                    <div className="text-sm text-slate-600 mt-2">{advance.notes}</div>
                  )}
                </div>
              ))}
            </div>
          )}
          <Button className={isDesktop ? "w-fit" : "w-full"} onClick={() => setShowAddForm(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Advance
          </Button>
        </>
      )}
    </>
  );

  return (
    <>
      {/* Mobile Sheet */}
      <div className="md:hidden">
        <Sheet open={isOpen} onOpenChange={onOpenChange}>
          <SheetContent side="bottom" className="h-[85vh]">
            <SheetHeader>
              <SheetTitle>Advances - {worker?.full_name}</SheetTitle>
              <SheetDescription>
                Total unsettled: {formatCurrency(totalUnsettled)}
              </SheetDescription>
            </SheetHeader>
            <div className="mt-6 space-y-4">
              {renderContent(false)}
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* Desktop Dialog */}
      <div className="hidden md:block">
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
          <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Advances - {worker?.full_name}</DialogTitle>
              <DialogDescription>
                Total unsettled: {formatCurrency(totalUnsettled)}
              </DialogDescription>
            </DialogHeader>
            <div className="mt-4 space-y-4">
              {renderContent(true)}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </>
  );
}
