import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { useLabour } from "@/hooks/useLabour";
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
import { Loader2, Plus, Users, MoreHorizontal, Pencil, PowerOff, Power, IndianRupee, Wallet } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";


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
  const [advanceWorker, setAdvanceWorker] = useState<Labour | null>(null);
  const [isAdvanceOpen, setIsAdvanceOpen] = useState(false);

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
      createLabour(
        {
          full_name: data.full_name,
          phone: data.phone || null,
          default_work_category: data.default_work_category,
          default_daily_rate: rateValue,
        },
        {
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
    setIsDialogOpen(true);
  };

  const handleDeactivate = (id: string, currentStatus: boolean) => {
    // The hook only handles deactivation (sets is_active: false)
    // For reactivation, we need to use updateLabour
    if (currentStatus) {
      // Deactivate
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
      // Reactivate using updateLabour
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
                    {WORK_CATEGORIES.map((category) => (
                      <option key={category} value={category}>
                        {category}
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

      {/* Advances Sheet/Dialog */}
      <AdvanceSheet
        worker={advanceWorker}
        isOpen={isAdvanceOpen}
        onOpenChange={setIsAdvanceOpen}
      />
    </div>
  );
}

// Type import for Labour
import type { Labour as LabourType } from "@/hooks/useLabour";
import type { LabourAdvanceWithDetails } from "@/hooks/useLabourAdvances";
type Labour = LabourType;

// Import Select components
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Zod schema for advance form
const advanceSchema = z.object({
  site_id: z.string().min(1, "Site is required"),
  amount: z.string().min(1, "Amount is required").refine((val) => parseFloat(val) > 0, "Amount must be greater than 0"),
  date_given: z.string().min(1, "Date is required"),
  notes: z.string().optional(),
});

type AdvanceFormData = z.infer<typeof advanceSchema>;

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

                  <div className="flex gap-2 pt-2">
                    <Button type="button" variant="outline" className="flex-1" onClick={() => setShowAddForm(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" className="flex-1" disabled={isCreating}>
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
                  <Button className="w-full" onClick={() => setShowAddForm(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Advance
                  </Button>
                </>
              )}
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
                    <Label htmlFor="amount_desktop" className="text-sm font-medium text-slate-900">Amount (₹) *</Label>
                    <Input
                      id="amount_desktop"
                      type="number"
                      placeholder="e.g., 2000"
                      {...register("amount")}
                    />
                    {errors.amount && (
                      <p className="text-sm text-red-500">{errors.amount.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="date_given_desktop" className="text-sm font-medium text-slate-900">Date *</Label>
                    <Input
                      id="date_given_desktop"
                      type="date"
                      {...register("date_given")}
                    />
                    {errors.date_given && (
                      <p className="text-sm text-red-500">{errors.date_given.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="notes_desktop" className="text-sm font-medium text-slate-900">Notes</Label>
                    <Input
                      id="notes_desktop"
                      placeholder="Optional notes..."
                      {...register("notes")}
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <Button type="button" variant="outline" onClick={() => setShowAddForm(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={isCreating}>
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
                  <Button className="w-full" onClick={() => setShowAddForm(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Advance
                  </Button>
                </>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </>
  );
}
