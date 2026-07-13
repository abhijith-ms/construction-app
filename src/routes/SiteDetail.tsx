import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { format, parseISO, subDays, addDays, startOfMonth, endOfMonth, isWithinInterval } from "date-fns";
import { useAuthStore } from "@/stores/authStore";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useSites } from "@/hooks/useSites";
import { useSiteWorkers } from "@/hooks/useSiteWorkers";
import { useLabourPool } from "@/hooks/useLabourPool";
import { useTodaySiteAttendance } from "@/hooks/useTodaySiteAttendance";
import { useSiteSettlements } from "@/hooks/useSiteSettlements";
import { useSiteExpenses } from "@/hooks/useExpenses";
import { usePayReceipts } from "@/hooks/usePayReceipts";
import { useCreateAttendance } from "@/hooks/useCreateAttendance";
import { useCreateLabourSiteAssignment } from "@/hooks/useCreateLabourSiteAssignment";
import { useUpdateSiteLabourAssignment } from "@/hooks/useUpdateSiteLabourAssignment";
import { useCreateSiteExpense } from "@/hooks/useCreateSiteExpense";
import { useCreateSitePayReceipt } from "@/hooks/useCreateSitePayReceipt";
import { useSiteWagePermission } from "@/hooks/useSiteWagePermission";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, Calendar, DollarSign, Users, Wallet, ClipboardList, Package, AlertTriangle } from "lucide-react";

type UserRole = "admin" | "office_manager" | "supervisor";

// Type for expense
interface SiteExpense {
  id: string;
  site_id: string;
  amount: number;
  date: string;
  category: string;
  description?: string | null;
}

// Type for pay receipt
interface PayReceipt {
  id: string;
  site_id: string;
  amount: number;
  date: string;
  payment_mode: string;
  notes?: string | null;
}

// Zod schemas for form validation
const expenseSchema = z.object({
  category: z.enum(["material", "transport", "food", "general"]),
  amount: z.number().positive("Amount must be greater than 0"),
  date: z.string().min(1, "Date is required"),
  description: z.string().optional(),
});

const receiptSchema = z.object({
  amount: z.number().positive("Amount must be greater than 0"),
  date: z.string().min(1, "Date is required"),
  paymentMode: z.enum(["cash", "gpay", "bank"]),
  notes: z.string().optional(),
});

type ExpenseFormData = z.infer<typeof expenseSchema>;
type ReceiptFormData = z.infer<typeof receiptSchema>;

// Sub-components for forms
function ExpenseForm({ siteId, onSubmit }: { siteId: string; onSubmit: (data: any) => void }) {
  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<ExpenseFormData>({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      date: format(new Date(), "yyyy-MM-dd"),
      category: "material",
    },
  });

  const category = watch("category");

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <DialogHeader>
        <DialogTitle>Add Site Expense</DialogTitle>
        <DialogDescription>
          Add an expense for site ID: {siteId.slice(0, 8)}...
        </DialogDescription>
      </DialogHeader>
      <div className="space-y-3">
        <div>
          <Label>Category</Label>
          <Select value={category} onValueChange={(value) => setValue("category", value as any)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="material">Material</SelectItem>
              <SelectItem value="transport">Transport</SelectItem>
              <SelectItem value="food">Food</SelectItem>
              <SelectItem value="general">General</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Amount</Label>
          <Input
            type="number"
            step="0.01"
            {...register("amount", { valueAsNumber: true })}
            placeholder="0.00"
          />
          {errors.amount && (
            <p className="text-sm text-red-500 mt-1">{errors.amount.message}</p>
          )}
        </div>
        <div>
          <Label>Date</Label>
          <Input type="date" {...register("date")} />
          {errors.date && (
            <p className="text-sm text-red-500 mt-1">{errors.date.message}</p>
          )}
        </div>
        <div>
          <Label>Description</Label>
          <Input
            {...register("description")}
            placeholder="Optional notes"
          />
        </div>
      </div>
      <DialogFooter>
        <Button type="submit">Save Expense</Button>
      </DialogFooter>
    </form>
  );
}

function ReceiptForm({ siteId, onSubmit }: { siteId: string; onSubmit: (data: any) => void }) {
  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<ReceiptFormData>({
    resolver: zodResolver(receiptSchema),
    defaultValues: {
      date: format(new Date(), "yyyy-MM-dd"),
      paymentMode: "cash",
    },
  });

  const paymentMode = watch("paymentMode");

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <DialogHeader>
        <DialogTitle>Add Pay Receipt</DialogTitle>
        <DialogDescription>
          Add a payment receipt for site ID: {siteId.slice(0, 8)}...
        </DialogDescription>
      </DialogHeader>
      <div className="space-y-3">
        <div>
          <Label>Amount</Label>
          <Input
            type="number"
            step="0.01"
            {...register("amount", { valueAsNumber: true })}
            placeholder="0.00"
          />
          {errors.amount && (
            <p className="text-sm text-red-500 mt-1">{errors.amount.message}</p>
          )}
        </div>
        <div>
          <Label>Date</Label>
          <Input type="date" {...register("date")} />
          {errors.date && (
            <p className="text-sm text-red-500 mt-1">{errors.date.message}</p>
          )}
        </div>
        <div>
          <Label>Payment Mode</Label>
          <Select value={paymentMode} onValueChange={(value) => setValue("paymentMode", value as any)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="cash">Cash</SelectItem>
              <SelectItem value="gpay">GPay</SelectItem>
              <SelectItem value="bank">Bank Transfer</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Notes</Label>
          <Input {...register("notes")} placeholder="Optional" />
        </div>
      </div>
      <DialogFooter>
        <Button type="submit">Save Receipt</Button>
      </DialogFooter>
    </form>
  );
}

export default function SiteDetail() {
  const { siteId } = useParams<{ siteId: string }>();
  const navigate = useNavigate();
  const { profile } = useAuthStore();
  const userRole = (profile?.role || "supervisor") as UserRole;

  const [activeTab, setActiveTab] = useState("overview");
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [expenseFilter, setExpenseFilter] = useState<"all" | "this-month" | "custom-range">("all");
  const [receiptFilter, setReceiptFilter] = useState<"all" | "this-month" | "custom-range">("all");
  const [expenseDateRange, setExpenseDateRange] = useState({ from: "", to: "" });
  const [receiptDateRange, setReceiptDateRange] = useState({ from: "", to: "" });

  // State for multi-site assignment confirmation dialog
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingWorker, setPendingWorker] = useState<{ id: string; full_name: string; default_work_category: string; default_daily_rate: number; activeSiteCount: number; } | null>(null);

  // Hooks for data fetching
  const { data: sites } = useSites();
  const { data: workers, refetch: refetchWorkers } = useSiteWorkers(siteId || "");
  const { data: labourPool, refetch: refetchLabourPool } = useLabourPool();
  const { data: attendance, refetch: refetchAttendance } = useTodaySiteAttendance(siteId || "", selectedDate);
  const { data: settlements, refetch: refetchSettlements } = useSiteSettlements(siteId || "");
  const { data: expenses } = useSiteExpenses(siteId);
  const { data: receipts } = usePayReceipts();
  const { canViewWages } = useSiteWagePermission(siteId || "");

  // Mutations
  const createAttendance = useCreateAttendance();
  const createAssignment = useCreateLabourSiteAssignment();
  const updateAssignment = useUpdateSiteLabourAssignment();
  const createExpense = useCreateSiteExpense();
  const createReceipt = useCreateSitePayReceipt();

  const site = sites?.find((s) => s.id === siteId);

  // Filter expenses based on selected filter
  const filteredExpenses = (expenses as SiteExpense[] || [] as SiteExpense[]).filter((expense: SiteExpense) => {
    if (!expense?.date) return false;
    const expenseDate = parseISO(expense.date);
    
    switch (expenseFilter) {
      case "this-month":
        const now = new Date();
        return isWithinInterval(expenseDate, {
          start: startOfMonth(now),
          end: endOfMonth(now),
        });
      case "custom-range":
        if (!expenseDateRange.from || !expenseDateRange.to) return true;
        return isWithinInterval(expenseDate, {
          start: parseISO(expenseDateRange.from),
          end: parseISO(expenseDateRange.to),
        });
      case "all":
      default:
        return true;
    }
  });

  // Filter receipts based on selected filter
  const filteredReceipts = (receipts?.filter((r: any) => r.site_id === siteId) as PayReceipt[] || []).filter((receipt: PayReceipt) => {
    if (!receipt?.date) return false;
    const receiptDate = parseISO(receipt.date);
    
    switch (receiptFilter) {
      case "this-month":
        const now = new Date();
        return isWithinInterval(receiptDate, {
          start: startOfMonth(now),
          end: endOfMonth(now),
        });
      case "custom-range":
        if (!receiptDateRange.from || !receiptDateRange.to) return true;
        return isWithinInterval(receiptDate, {
          start: parseISO(receiptDateRange.from),
          end: parseISO(receiptDateRange.to),
        });
      case "all":
      default:
        return true;
    }
  });

  // Calculate totals
  const totalReceived = filteredReceipts.reduce((sum: number, r: PayReceipt) => sum + (r.amount || 0), 0);
  const totalSpent = filteredExpenses.reduce((sum: number, e: SiteExpense) => sum + (e.amount || 0), 0);
  const netBalance = totalReceived - totalSpent;

  // Pending settlements (not paid)
  const pendingSettlements = settlements?.filter(
    (s: any) => s.paymentStatus === "pending" || s.paymentStatus === "overdue"
  ) || [];

  const isAdminOrOffice = userRole === "admin" || userRole === "office_manager";

  if (!site) {
    return (
      <div className="p-4 text-center">
        <p className="text-muted-foreground">Site not found</p>
        <Button onClick={() => navigate("/sites")} className="mt-4">
          Back to Sites
        </Button>
      </div>
    );
  }

  const handleMarkAttendance = async (
    labourId: string,
    status: "present" | "absent" | "half_day" | "leave"
  ) => {
    try {
      const workerRate = workers?.find((w: any) => w.labourId === labourId)?.defaultRate || 0;
      const workerRates: Record<string, number> = { [labourId]: workerRate };

      await createAttendance.mutateAsync({
        records: [{
          labour_id: labourId,
          site_id: siteId!,
          date: format(selectedDate, "yyyy-MM-dd"),
          status,
          work_category: "mason",
          last_edited_by: profile?.id || "",
          rate_applied: status === "absent" || status === "leave" ? null : workerRate,
        }],
        canViewWages: canViewWages,
        workerDefaultRates: workerRates,
      });
      toast.success("Attendance marked");
      refetchAttendance();
    } catch (error: any) {
      toast.error("Failed to mark attendance: " + error.message);
    }
  };

  const checkAndAssignWorker = async (worker: { id: string; full_name: string; default_work_category: string; default_daily_rate: number; activeSiteCount: number; }) => {
    if (worker.activeSiteCount > 0) {
      setPendingWorker(worker);
      setShowConfirmDialog(true);
    } else {
      await handleAssignWorker(worker.id, worker.default_work_category || "mason", worker.default_daily_rate || 0);
    }
  };

  const handleAssignWorker = async (labourId: string, taskCategory: string, dailyRate: number) => {
    try {
      await createAssignment.mutateAsync({
        site_id: siteId!,
        labour_id: labourId,
        task_category: taskCategory,
        daily_rate: dailyRate,
        start_date: format(new Date(), "yyyy-MM-dd"),
        assigned_by: profile?.id || "",
      });
      toast.success("Worker assigned to site");
      refetchLabourPool();
      refetchWorkers();
    } catch (error: any) {
      toast.error("Failed to assign worker: " + error.message);
    }
  };

  const confirmAssignment = async () => {
    if (pendingWorker) {
      await handleAssignWorker(pendingWorker.id, pendingWorker.default_work_category || "mason", pendingWorker.default_daily_rate || 0);
      setShowConfirmDialog(false);
      setPendingWorker(null);
    }
  };

  const handleRemoveWorker = async (assignmentId: string) => {
    try {
      await updateAssignment.mutateAsync({
        assignmentId,
        siteId: siteId!,
        isActive: false,
      });
      toast.success("Worker removed from site");
      refetchWorkers();
    } catch (error: any) {
      toast.error("Failed to remove worker: " + error.message);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Tabs wrapper - encompasses entire page */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        {/* Sticky Header */}
        <div className="sticky top-0 z-10 bg-background border-b px-4 py-4">
          {/* Header */}
          <div className="flex items-center gap-4 mb-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/sites")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex-1">
              <h1 className="text-lg font-semibold">{site.name}</h1>
              <p className="text-sm text-muted-foreground">{site.client_name}</p>
            </div>
            <Badge variant={site.status === "active" ? "default" : "secondary"}>
              {site.status}
            </Badge>
          </div>

          {/* Tab Navigation */}
          <TabsList className="w-full flex h-10">
            <TabsTrigger value="overview" className="flex-1 text-xs px-1">Overview</TabsTrigger>
            <TabsTrigger value="labour" className="flex-1 text-xs px-1">Labour</TabsTrigger>
            <TabsTrigger value="attendance" className="flex-1 text-xs px-1">Attendance</TabsTrigger>
            <TabsTrigger value="expenses" className="flex-1 text-xs px-1">Expenses</TabsTrigger>
            <TabsTrigger value="receipts" className="flex-1 text-xs px-1">Receipts</TabsTrigger>
            <TabsTrigger value="payroll" className="flex-1 text-xs px-1">Payroll</TabsTrigger>
          </TabsList>
        </div>

        {/* Tab Content - scrollable content area */}
        <div className="px-4 py-4">
          {/* Tab 1: Overview */}
          <TabsContent value="overview" className="mt-0 space-y-4">
            {/* Summary Cards */}
            <div className="grid grid-cols-2 gap-3">
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Budget</CardDescription>
                  <CardTitle className="text-xl">₹{((site.budget || 0) as number).toLocaleString()}</CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Total Received</CardDescription>
                  <CardTitle className="text-xl text-green-600">₹{totalReceived.toLocaleString()}</CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Total Spent</CardDescription>
                  <CardTitle className="text-xl text-red-600">₹{totalSpent.toLocaleString()}</CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Net Balance</CardDescription>
                  <CardTitle className={`text-xl ${netBalance >= 0 ? "text-green-600" : "text-red-600"}`}>
                    ₹{netBalance.toLocaleString()}
                  </CardTitle>
                </CardHeader>
              </Card>
            </div>

            {/* Workers Today */}
            <Card>
              <CardHeader>
                <CardTitle>Site Activity</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">Workers today</span>
                  </div>
                  <span className="font-medium">
                    {attendance?.filter((a: any) => a.status === "present" || a.status === "half_day").length || 0}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Wallet className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">Pending payroll this week</span>
                  </div>
                  <span className="font-medium text-orange-600">{pendingSettlements.length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">Workers on roster</span>
                  </div>
                  <span className="font-medium">{workers?.length || 0}</span>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab 2: Labour */}
          <TabsContent value="labour" className="mt-0 space-y-4">
            {/* Rostered Workers */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Rostered Workers</CardTitle>
                {isAdminOrOffice && (
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button size="sm">Assign Worker</Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-lg">
                      <DialogHeader>
                        <DialogTitle>Assign Worker to Site</DialogTitle>
                        <DialogDescription>
                          Select a worker from the company pool to assign to this site.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="max-h-[300px] overflow-y-auto space-y-2 mt-4">
                        {labourPool?.filter((l: any) => l.is_active).map((worker: any) => (
                          <div
                            key={worker.id}
                            className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50"
                          >
                            <div>
                              <p className="font-medium">{worker.full_name}</p>
                              <p className="text-sm text-muted-foreground">
                                {worker.default_work_category} • ₹{worker.default_daily_rate}/day
                              </p>
                              {worker.activeSiteCount > 0 && (
                                <p className="text-xs text-orange-600 mt-1">
                                  Already active at {worker.activeSiteCount} site(s)
                                </p>
                              )}
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => checkAndAssignWorker(worker)}
                            >
                              Assign
                            </Button>
                          </div>
                        ))}
                      </div>
                    </DialogContent>
                  </Dialog>
                )}
              </CardHeader>
              <CardContent>
                {workers && workers.length > 0 ? (
                  <div className="space-y-2">
                    {workers.map((worker: any) => (
                      <div
                        key={worker.assignmentId}
                        className="flex items-center justify-between p-3 border rounded-lg"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{worker.fullName}</p>
                            {worker.activeSiteCount > 1 && (
                              <Badge variant="secondary" className="text-xs bg-orange-100 text-orange-800">
                                Multi-site
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {worker.category} • ₹{worker.defaultRate}/day
                          </p>
                        </div>
                        {isAdminOrOffice && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-red-600 hover:text-red-700"
                            onClick={() => handleRemoveWorker(worker.assignmentId)}
                          >
                            Remove
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-8">
                    No workers assigned to this site
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Attendance Shortcut */}
            <Button
              className="w-full"
              onClick={() => {
                setActiveTab("attendance");
                setSelectedDate(new Date());
              }}
            >
              <ClipboardList className="h-4 w-4 mr-2" />
              Mark Today's Attendance
            </Button>
          </TabsContent>

          {/* Tab 3: Attendance */}
          <TabsContent value="attendance" className="mt-0 space-y-4">
            {/* Date Navigation */}
            <div className="flex items-center justify-between bg-muted p-3 rounded-lg">
              <Button variant="ghost" size="icon" onClick={() => setSelectedDate(subDays(selectedDate, 1))}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{format(selectedDate, "EEE, MMM d")}</span>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setSelectedDate(addDays(selectedDate, 1))}>
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>

            {/* Attendance Cards */}
            <div className="space-y-2">
              {workers?.map((worker: any) => {
                const record = attendance?.find((a: any) => a.labourId === worker.labourId);
                return (
                  <Card key={worker.labourId} className={record ? "border-green-200 bg-green-50/50" : ""}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{worker.fullName}</p>
                            {worker.activeSiteCount > 1 && (
                              <Badge variant="outline" className="text-xs">
                                Multi-site
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">{worker.category}</p>
                        </div>
                        {canViewWages && (
                          <p className="text-sm font-medium">₹{worker.defaultRate}/day</p>
                        )}
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <Button
                          size="sm"
                          variant={record?.status === "present" ? "default" : "outline"}
                          className={record?.status === "present" ? "bg-green-600" : ""}
                          onClick={() => handleMarkAttendance(worker.labourId, "present")}
                        >
                          Present
                        </Button>
                        <Button
                          size="sm"
                          variant={record?.status === "absent" ? "default" : "outline"}
                          className={record?.status === "absent" ? "bg-red-600" : ""}
                          onClick={() => handleMarkAttendance(worker.labourId, "absent")}
                        >
                          Absent
                        </Button>
                        <Button
                          size="sm"
                          variant={record?.status === "half_day" ? "default" : "outline"}
                          className={record?.status === "half_day" ? "bg-yellow-600" : ""}
                          onClick={() => handleMarkAttendance(worker.labourId, "half_day")}
                        >
                          Half Day
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            <p className="text-xs text-muted-foreground text-center">
              Attendance saves automatically when you tap Present, Absent, or Half Day.
            </p>
          </TabsContent>

          {/* Tab 4: Expenses */}
          <TabsContent value="expenses" className="mt-0 space-y-4">
            {/* Date Filter */}
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <Select value={expenseFilter} onValueChange={(value) => setExpenseFilter(value as typeof expenseFilter)}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">From Beginning</SelectItem>
                    <SelectItem value="this-month">This Month</SelectItem>
                    <SelectItem value="custom-range">Custom Range</SelectItem>
                  </SelectContent>
                </Select>
                {isAdminOrOffice && (
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button size="sm">Add Expense</Button>
                    </DialogTrigger>
                    <DialogContent>
                      <ExpenseForm
                        siteId={siteId!}
                        onSubmit={async (data: any) => {
                          await createExpense.mutateAsync({ siteId: siteId!, ...data });
                          toast.success("Expense added");
                        }}
                      />
                    </DialogContent>
                  </Dialog>
                )}
              </div>
              {expenseFilter === "custom-range" && (
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <Label className="text-xs">From</Label>
                    <Input
                      type="date"
                      value={expenseDateRange.from}
                      onChange={(e) => setExpenseDateRange(prev => ({ ...prev, from: e.target.value }))}
                    />
                  </div>
                  <div className="flex-1">
                    <Label className="text-xs">To</Label>
                    <Input
                      type="date"
                      value={expenseDateRange.to}
                      onChange={(e) => setExpenseDateRange(prev => ({ ...prev, to: e.target.value }))}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Expenses List */}
            <Card>
              <CardHeader>
                <CardTitle>Site Expenses</CardTitle>
                <CardDescription>
                  Total: ₹{filteredExpenses.reduce((s: number, e: SiteExpense) => s + e.amount, 0).toLocaleString()} across {filteredExpenses.length} expenses
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {filteredExpenses
                    .sort((a: SiteExpense, b: SiteExpense) => new Date(b.date).getTime() - new Date(a.date).getTime())
                    .map((expense: SiteExpense) => (
                      <div key={expense.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary">{expense.category}</Badge>
                            <span className="text-sm text-muted-foreground">{format(parseISO(expense.date), "MMM d, yyyy")}</span>
                          </div>
                          <p className="text-sm mt-1">{expense.description || "No description"}</p>
                        </div>
                        <span className="font-medium">₹{expense.amount.toLocaleString()}</span>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab 5: Receipts */}
          <TabsContent value="receipts" className="mt-0 space-y-4">
            {/* Date Filter */}
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <Select value={receiptFilter} onValueChange={(value) => setReceiptFilter(value as typeof receiptFilter)}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">From Beginning</SelectItem>
                    <SelectItem value="this-month">This Month</SelectItem>
                    <SelectItem value="custom-range">Custom Range</SelectItem>
                  </SelectContent>
                </Select>
                {isAdminOrOffice && (
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button size="sm">Add Receipt</Button>
                    </DialogTrigger>
                    <DialogContent>
                      <ReceiptForm
                        siteId={siteId!}
                        onSubmit={async (data: any) => {
                          await createReceipt.mutateAsync({ siteId: siteId!, ...data });
                          toast.success("Receipt added");
                        }}
                      />
                    </DialogContent>
                  </Dialog>
                )}
              </div>
              {receiptFilter === "custom-range" && (
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <Label className="text-xs">From</Label>
                    <Input
                      type="date"
                      value={receiptDateRange.from}
                      onChange={(e) => setReceiptDateRange(prev => ({ ...prev, from: e.target.value }))}
                    />
                  </div>
                  <div className="flex-1">
                    <Label className="text-xs">To</Label>
                    <Input
                      type="date"
                      value={receiptDateRange.to}
                      onChange={(e) => setReceiptDateRange(prev => ({ ...prev, to: e.target.value }))}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Receipts List */}
            <Card>
              <CardHeader>
                <CardTitle>Pay Receipts</CardTitle>
                <CardDescription>
                  Total: ₹{filteredReceipts.reduce((s: number, r: PayReceipt) => s + r.amount, 0).toLocaleString()} across {filteredReceipts.length} receipts
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {filteredReceipts
                    .sort((a: PayReceipt, b: PayReceipt) => new Date(b.date).getTime() - new Date(a.date).getTime())
                    .map((receipt: PayReceipt) => (
                      <div key={receipt.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary">{receipt.payment_mode}</Badge>
                            <span className="text-sm text-muted-foreground">{format(parseISO(receipt.date), "MMM d, yyyy")}</span>
                          </div>
                          {receipt.notes && <p className="text-sm mt-1 text-muted-foreground">{receipt.notes}</p>}
                        </div>
                        <span className="font-medium text-green-600">₹{receipt.amount.toLocaleString()}</span>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab 6: Payroll */}
          <TabsContent value="payroll" className="mt-0 space-y-4">
            {isAdminOrOffice && (
              <Button
                className="w-full"
                onClick={() => {
                  toast.info("Running settlement calculation...");
                  refetchSettlements();
                }}
              >
                <DollarSign className="h-4 w-4 mr-2" />
                Run Settlement for Current Week
              </Button>
            )}

            <Card>
              <CardHeader>
                <CardTitle>Weekly Settlements</CardTitle>
                <CardDescription>
                  {settlements && settlements.length > 0
                    ? "Worker settlements for this site"
                    : "No settlements yet"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {settlements?.map((settlement: any) => (
                    <div key={settlement.id} className="p-3 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">{settlement.workerName}</span>
                        <Badge
                          variant={
                            settlement.paymentStatus === "paid"
                              ? "default"
                              : settlement.paymentStatus === "overdue"
                              ? "destructive"
                              : "secondary"
                          }
                        >
                          {settlement.paymentStatus}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <span className="text-muted-foreground">Gross:</span>
                          <span className="ml-2">₹{(settlement.grossWages || 0).toLocaleString()}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Advances:</span>
                          <span className="ml-2 text-red-600">-₹{(settlement.totalAdvances || 0).toLocaleString()}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Carried over:</span>
                          <span className="ml-2">₹{(settlement.carriedOverDue || 0).toLocaleString()}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground font-medium">Net Payable:</span>
                          <span className="ml-2 font-medium">₹{(settlement.netPayable || 0).toLocaleString()}</span>
                        </div>
                      </div>
                      {isAdminOrOffice && settlement.paymentStatus !== "paid" && (
                        <Button size="sm" className="w-full mt-3" variant="outline">
                          Mark as Paid
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </div>
      </Tabs>

      {/* Multi-site Assignment Confirmation Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              Multi-site Worker
            </AlertDialogTitle>
            <AlertDialogDescription>
              This worker is currently active at {pendingWorker?.activeSiteCount || 0} other site(s).
              Assign them here as well?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPendingWorker(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmAssignment}>Confirm</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
