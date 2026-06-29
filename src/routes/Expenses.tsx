import { useState, useMemo } from "react";
import { useSearchParams, Navigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  useSiteExpenses,
  useOfficeExpenses,
  useCreateSiteExpense,
  useUpdateSiteExpense,
  useDeleteSiteExpense,
  useCreateOfficeExpense,
  useUpdateOfficeExpense,
  useDeleteOfficeExpense,
  SITE_EXPENSE_CATEGORIES,
  OFFICE_EXPENSE_CATEGORIES,
  type SiteExpense,
  type OfficeExpense,
} from "@/hooks/useExpenses";
import { useSites } from "@/hooks/useSites";
import { useAssignedSites } from "@/hooks/useAssignedSites";
import { useAuthStore } from "@/stores/authStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Loader2,
  Plus,
  Pencil,
  Trash2,
  Receipt,
  Building2,
  Home,
} from "lucide-react";
import { format, parseISO } from "date-fns";

// Site expense form schema
const siteExpenseSchema = z.object({
  site_id: z.string().min(1, "Site is required"),
  category: z.string().min(1, "Category is required"),
  amount: z.string().min(1, "Amount is required"),
  date: z.string().min(1, "Date is required"),
  description: z.string().optional(),
  work_type: z.string().optional(),
});

// Office expense form schema
const officeExpenseSchema = z.object({
  category: z.string().min(1, "Category is required"),
  amount: z.string().min(1, "Amount is required"),
  date: z.string().min(1, "Date is required"),
  description: z.string().optional(),
});

type SiteExpenseFormData = z.infer<typeof siteExpenseSchema>;
type OfficeExpenseFormData = z.infer<typeof officeExpenseSchema>;

export function Expenses() {
  const { profile } = useAuthStore();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") || "site";

  // Role-based permissions
  const isAdmin = profile?.role === "admin";
  const isOfficeManager = profile?.role === "office_manager";
  const isSupervisor = profile?.role === "supervisor";
  const canManageExpenses = isAdmin || isOfficeManager || isSupervisor;

  // Supervisors can only access site expenses tab
  if (isSupervisor && activeTab === "office") {
    return <Navigate to="/expenses?tab=site" replace />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Expenses</h1>
          <p className="text-muted-foreground">
            Track site and office expenses
          </p>
        </div>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={(value) => {
          setSearchParams({ tab: value });
        }}
        className="space-y-6"
      >
        <TabsList>
          <TabsTrigger value="site" className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Site Expenses
          </TabsTrigger>
          {!isSupervisor && (
            <TabsTrigger value="office" className="flex items-center gap-2">
              <Home className="h-4 w-4" />
              Office Expenses
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="site" className="space-y-6">
          <SiteExpensesTab canManage={canManageExpenses} isSupervisor={isSupervisor} />
        </TabsContent>

        <TabsContent value="office" className="space-y-6">
          {!isSupervisor && <OfficeExpensesTab canManage={canManageExpenses} />}
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Site Expenses Tab Component
function SiteExpensesTab({
  canManage,
  isSupervisor,
}: {
  canManage: boolean;
  isSupervisor: boolean;
}) {
  const { data: allSites } = useSites();
  const { data: assignedSites } = useAssignedSites();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<SiteExpense | null>(null);
  const [selectedSiteId, setSelectedSiteId] = useState<string>("");

  // Permission: Admin/Office = full CRUD, Supervisor = Add only (no edit/delete)
  const canEdit = !isSupervisor; // Only Admin/Office can edit/delete

  // For supervisors, only show their assigned sites
  const availableSites = useMemo(() => {
    if (isSupervisor && assignedSites) {
      const assignedIds = new Set(assignedSites.map((s) => s.id));
      return (allSites || []).filter((s) => assignedIds.has(s.id));
    }
    return allSites || [];
  }, [allSites, assignedSites, isSupervisor]);

  const { data: expenses, isLoading } = useSiteExpenses(
    selectedSiteId || undefined
  );

  const createExpense = useCreateSiteExpense();
  const updateExpense = useUpdateSiteExpense();
  const deleteExpense = useDeleteSiteExpense();

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<SiteExpenseFormData>({
    resolver: zodResolver(siteExpenseSchema),
    defaultValues: {
      date: format(new Date(), "yyyy-MM-dd"),
    },
  });

  const onSubmit = (data: SiteExpenseFormData) => {
    const amountValue = parseFloat(data.amount);

    if (editingExpense && canEdit) {
      // Update existing expense (Admin/Office only)
      updateExpense.mutate(
        {
          id: editingExpense.id,
          site_id: data.site_id,
          category: data.category,
          amount: amountValue,
          date: data.date,
          description: data.description || null,
          work_type: data.work_type || null,
        },
        {
          onSuccess: () => {
            setIsDialogOpen(false);
            setEditingExpense(null);
            reset();
          },
        }
      );
    } else {
      // Create new expense (all roles with canManage)
      createExpense.mutate(
        {
          site_id: data.site_id,
          category: data.category,
          amount: amountValue,
          date: data.date,
          description: data.description || null,
          work_type: data.work_type || null,
        },
        {
          onSuccess: () => {
            setIsDialogOpen(false);
            reset();
          },
        }
      );
    }
  };

  const handleEdit = (expense: SiteExpense) => {
    // Only Admin/Office can edit - supervisors don't have this option
    if (isSupervisor) return;
    
    // Set editing state and pre-fill form
    setEditingExpense(expense);
    setValue("site_id", expense.site_id);
    setValue("category", expense.category);
    setValue("amount", expense.amount.toString());
    setValue("date", expense.date);
    setValue("description", expense.description || "");
    setValue("work_type", expense.work_type || "");
    setIsDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    // Only Admin/Office can delete - this function shouldn't be called for supervisors
    if (isSupervisor) return;
    
    if (confirm("Are you sure you want to delete this expense?")) {
      deleteExpense.mutate(id);
    }
  };

  const handleOpenDialog = () => {
    setEditingExpense(null);
    reset({ date: format(new Date(), "yyyy-MM-dd") });
    setIsDialogOpen(true);
  };

  const totalAmount = useMemo(() => {
    return (expenses || []).reduce((sum, e) => sum + Number(e.amount), 0);
  }, [expenses]);

  const isSubmitting = createExpense.isPending || updateExpense.isPending;

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-2">
              <Label htmlFor="site-filter">Site</Label>
              <Select value={selectedSiteId} onValueChange={setSelectedSiteId}>
                <SelectTrigger className="w-[200px]" id="site-filter">
                  <SelectValue placeholder="All Sites" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Sites</SelectItem>
                  {availableSites.map((site) => (
                    <SelectItem key={site.id} value={site.id}>
                      {site.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex-1" />

            <div className="flex items-center gap-2">
              <Receipt className="h-5 w-5 text-muted-foreground" />
              <span className="font-medium">
                Total: {new Intl.NumberFormat("en-IN", {
                  style: "currency",
                  currency: "INR",
                  maximumFractionDigits: 0,
                }).format(totalAmount)}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Expenses List */}
      <Card>
        <div className="flex flex-col md:flex-row md:items-center justify-between p-6 gap-4">
          <CardHeader className="p-0">
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Site Expenses
            </CardTitle>
            <CardDescription>
              Expenses tied to specific construction sites
            </CardDescription>
          </CardHeader>
          {canManage && (
            <Button onClick={handleOpenDialog} className="w-full md:w-auto">
              <Plus className="h-4 w-4 mr-2" />
              Add Expense
            </Button>
          )}
        </div>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : !expenses || expenses.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Receipt className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No expenses found</p>
              {canManage && (
                <p className="text-sm mt-2">Click "Add Expense" to record a site expense</p>
              )}
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Site</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Work Type</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      {canEdit && <TableHead className="w-[100px]">Actions</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {expenses.map((expense) => (
                      <TableRow key={expense.id}>
                        <TableCell>
                          {format(parseISO(expense.date), "dd MMM yyyy")}
                        </TableCell>
                        <TableCell>
                          {expense.site?.name || "—"}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize">
                            {expense.category}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate">
                          {expense.description || "—"}
                        </TableCell>
                        <TableCell>{expense.work_type || "—"}</TableCell>
                        <TableCell className="text-right font-medium">
                          {new Intl.NumberFormat("en-IN", {
                            style: "currency",
                            currency: "INR",
                            maximumFractionDigits: 0,
                          }).format(Number(expense.amount))}
                        </TableCell>
                        {canEdit && (
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleEdit(expense)}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDelete(expense.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile Cards */}
              <div className="md:hidden space-y-4">
                {expenses.map((expense) => (
                  <Card key={expense.id} className="overflow-hidden">
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <Badge variant="outline" className="capitalize mb-1">
                            {expense.category}
                          </Badge>
                          <p className="text-xs text-muted-foreground">
                            {format(parseISO(expense.date), "dd MMM yyyy")}
                          </p>
                        </div>
                        <p className="text-xl font-bold">
                          {new Intl.NumberFormat("en-IN", {
                            style: "currency",
                            currency: "INR",
                            maximumFractionDigits: 0,
                          }).format(Number(expense.amount))}
                        </p>
                      </div>
                      <div className="text-sm">
                        <span className="text-muted-foreground">Site:</span>{" "}
                        <span className="font-medium">{expense.site?.name || "—"}</span>
                      </div>
                      {expense.description && (
                        <p className="text-sm text-muted-foreground">
                          {expense.description}
                        </p>
                      )}
                      {expense.work_type && (
                        <div className="text-sm">
                          <span className="text-muted-foreground">Work Type:</span>{" "}
                          <span>{expense.work_type}</span>
                        </div>
                      )}
                      {canEdit && (
                        <div className="flex items-center gap-2 pt-2 border-t">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="flex-1"
                            onClick={() => handleEdit(expense)}
                          >
                            <Pencil className="h-4 w-4 mr-2" />
                            Edit
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="flex-1 text-destructive"
                            onClick={() => handleDelete(expense.id)}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {editingExpense ? "Edit Site Expense" : "Add Site Expense"}
            </DialogTitle>
            <DialogDescription>
              {editingExpense
                ? "Update expense details"
                : "Record a new expense for a site"}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="site_id">Site</Label>
              <Select
                value={watch("site_id")}
                onValueChange={(value) => setValue("site_id", value)}
              >
                <SelectTrigger id="site_id">
                  <SelectValue placeholder="Select a site" />
                </SelectTrigger>
                <SelectContent>
                  {availableSites.map((site) => (
                    <SelectItem key={site.id} value={site.id}>
                      {site.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.site_id && (
                <p className="text-sm text-destructive">{errors.site_id.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select
                value={watch("category")}
                onValueChange={(value) => setValue("category", value)}
              >
                <SelectTrigger id="category">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {SITE_EXPENSE_CATEGORIES.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.category && (
                <p className="text-sm text-destructive">{errors.category.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount">Amount (₹)</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                {...register("amount")}
                placeholder="e.g., 5000"
              />
              {errors.amount && (
                <p className="text-sm text-destructive">{errors.amount.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="date">Date</Label>
              <Input id="date" type="date" {...register("date")} />
              {errors.date && (
                <p className="text-sm text-destructive">{errors.date.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description (optional)</Label>
              <Input
                id="description"
                {...register("description")}
                placeholder="e.g., Cement bags for foundation"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="work_type">
                Work Type (optional)
              </Label>
              <Input
                id="work_type"
                {...register("work_type")}
                placeholder="e.g., Mason, Helper"
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : null}
                {editingExpense ? "Update" : "Add"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Office Expenses Tab Component
function OfficeExpensesTab({ canManage }: { canManage: boolean }) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<OfficeExpense | null>(null);

  const { data: expenses, isLoading } = useOfficeExpenses();

  const createExpense = useCreateOfficeExpense();
  const updateExpense = useUpdateOfficeExpense();
  const deleteExpense = useDeleteOfficeExpense();

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<OfficeExpenseFormData>({
    resolver: zodResolver(officeExpenseSchema),
    defaultValues: {
      date: format(new Date(), "yyyy-MM-dd"),
    },
  });

  const onSubmit = (data: OfficeExpenseFormData) => {
    const amountValue = parseFloat(data.amount);

    if (editingExpense) {
      updateExpense.mutate(
        {
          id: editingExpense.id,
          category: data.category,
          amount: amountValue,
          date: data.date,
          description: data.description || null,
        },
        {
          onSuccess: () => {
            setIsDialogOpen(false);
            setEditingExpense(null);
            reset();
          },
        }
      );
    } else {
      createExpense.mutate(
        {
          category: data.category,
          amount: amountValue,
          date: data.date,
          description: data.description || null,
        },
        {
          onSuccess: () => {
            setIsDialogOpen(false);
            reset();
          },
        }
      );
    }
  };

  const handleEdit = (expense: OfficeExpense) => {
    setEditingExpense(expense);
    setValue("category", expense.category);
    setValue("amount", expense.amount.toString());
    setValue("date", expense.date);
    setValue("description", expense.description || "");
    setIsDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this expense?")) {
      deleteExpense.mutate(id);
    }
  };

  const handleOpenDialog = () => {
    setEditingExpense(null);
    reset({ date: format(new Date(), "yyyy-MM-dd") });
    setIsDialogOpen(true);
  };

  const totalAmount = useMemo(() => {
    return (expenses || []).reduce((sum, e) => sum + Number(e.amount), 0);
  }, [expenses]);

  const isSubmitting = createExpense.isPending;

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-end">
            <div className="flex items-center gap-2">
              <Receipt className="h-5 w-5 text-muted-foreground" />
              <span className="font-medium">
                Total: {new Intl.NumberFormat("en-IN", {
                  style: "currency",
                  currency: "INR",
                  maximumFractionDigits: 0,
                }).format(totalAmount)}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Expenses List */}
      <Card>
        <div className="flex flex-col md:flex-row md:items-center justify-between p-6 gap-4">
          <CardHeader className="p-0">
            <CardTitle className="flex items-center gap-2">
              <Home className="h-5 w-5" />
              Office Expenses
            </CardTitle>
            <CardDescription>
              Company-level expenses not tied to any site
            </CardDescription>
          </CardHeader>
          {canManage && (
            <Button onClick={handleOpenDialog} className="w-full md:w-auto">
              <Plus className="h-4 w-4 mr-2" />
              Add Expense
            </Button>
          )}
        </div>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : !expenses || expenses.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Home className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No office expenses found</p>
              {canManage && (
                <p className="text-sm mt-2">Click "Add Expense" to record an office expense</p>
              )}
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Last Edited</TableHead>
                      {canManage && <TableHead className="w-[100px]">Actions</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {expenses.map((expense) => (
                      <TableRow key={expense.id}>
                        <TableCell>
                          {format(parseISO(expense.date), "dd MMM yyyy")}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize">
                            {expense.category}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate">
                          {expense.description || "—"}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {new Intl.NumberFormat("en-IN", {
                            style: "currency",
                            currency: "INR",
                            maximumFractionDigits: 0,
                          }).format(Number(expense.amount))}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {expense.last_editor?.full_name || "—"}
                          <br />
                          {expense.last_edited_at
                            ? format(parseISO(expense.last_edited_at), "dd MMM yyyy")
                            : ""}
                        </TableCell>
                        {canManage && (
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleEdit(expense)}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDelete(expense.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile Cards */}
              <div className="md:hidden space-y-4">
                {expenses.map((expense) => (
                  <Card key={expense.id} className="overflow-hidden">
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <Badge variant="outline" className="capitalize mb-1">
                            {expense.category}
                          </Badge>
                          <p className="text-xs text-muted-foreground">
                            {format(parseISO(expense.date), "dd MMM yyyy")}
                          </p>
                        </div>
                        <p className="text-xl font-bold">
                          {new Intl.NumberFormat("en-IN", {
                            style: "currency",
                            currency: "INR",
                            maximumFractionDigits: 0,
                          }).format(Number(expense.amount))}
                        </p>
                      </div>
                      {expense.description && (
                        <p className="text-sm text-muted-foreground">
                          {expense.description}
                        </p>
                      )}
                      <div className="text-sm text-muted-foreground">
                        <span>Last edited by {expense.last_editor?.full_name || "—"}</span>
                        {expense.last_edited_at && (
                          <span className="ml-1">
                            on {format(parseISO(expense.last_edited_at), "dd MMM yyyy")}
                          </span>
                        )}
                      </div>
                      {canManage && (
                        <div className="flex items-center gap-2 pt-2 border-t">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="flex-1"
                            onClick={() => handleEdit(expense)}
                          >
                            <Pencil className="h-4 w-4 mr-2" />
                            Edit
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="flex-1 text-destructive"
                            onClick={() => handleDelete(expense.id)}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {editingExpense ? "Edit Office Expense" : "Add Office Expense"}
            </DialogTitle>
            <DialogDescription>
              {editingExpense
                ? "Update expense details"
                : "Record a new company expense"}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select
                value={watch("category")}
                onValueChange={(value) => setValue("category", value)}
              >
                <SelectTrigger id="category">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {OFFICE_EXPENSE_CATEGORIES.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.category && (
                <p className="text-sm text-destructive">{errors.category.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount">Amount (₹)</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                {...register("amount")}
                placeholder="e.g., 15000"
              />
              {errors.amount && (
                <p className="text-sm text-destructive">{errors.amount.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="date">Date</Label>
              <Input id="date" type="date" {...register("date")} />
              {errors.date && (
                <p className="text-sm text-destructive">{errors.date.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description (optional)</Label>
              <Input
                id="description"
                {...register("description")}
                placeholder="e.g., Monthly office rent"
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : null}
                {editingExpense ? "Update" : "Add"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
