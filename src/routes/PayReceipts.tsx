import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { usePayReceipts } from "@/hooks/usePayReceipts";
import { useSites } from "@/hooks/useSites";
import { useCreatePayReceipt } from "@/hooks/useCreatePayReceipt";
import { useUpdatePayReceipt } from "@/hooks/useUpdatePayReceipt";
import { useDeletePayReceipt } from "@/hooks/useDeletePayReceipt";
import { useAuthStore } from "@/stores/authStore";
import { format } from "date-fns";
import { IndianRupee, Plus, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

const payReceiptSchema = z.object({
  site_id: z.string().uuid("Please select a site"),
  date: z.string().min(1, "Date is required"),
  amount: z.string().min(1, "Amount is required"),
  payment_mode: z.enum(["cash", "gpay", "bank"]),
  notes: z.string().optional(),
});

interface PayReceiptFormData {
  site_id: string;
  date: string;
  amount: string;
  payment_mode: "cash" | "gpay" | "bank";
  notes?: string;
}

const PAYMENT_MODES = [
  { value: "cash", label: "Cash" },
  { value: "gpay", label: "GPay" },
  { value: "bank", label: "Bank Transfer" },
] as const;

export default function PayReceipts() {
  const { profile } = useAuthStore();
  const [selectedSiteId, setSelectedSiteId] = useState<string>("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const { data: receipts = [], isLoading: isReceiptsLoading } = usePayReceipts({
    siteId: selectedSiteId || null,
  });
  const { data: sites = [] } = useSites();
  const createReceipt = useCreatePayReceipt();
  const updateReceipt = useUpdatePayReceipt();
  const deleteReceipt = useDeletePayReceipt();

  const form = useForm<PayReceiptFormData>({
    resolver: zodResolver(payReceiptSchema),
    defaultValues: {
      site_id: "",
      date: format(new Date(), "yyyy-MM-dd"),
      amount: "",
      payment_mode: "cash",
      notes: "",
    },
  });

  // Calculate running total for filtered receipts
  const runningTotal = receipts.reduce((sum, receipt) => sum + Number(receipt.amount), 0);

  // Format amount to Indian Rupees
  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    return format(new Date(dateString), "dd MMM yyyy");
  };

  // Get payment mode label
  const getPaymentModeLabel = (value: string) => {
    return PAYMENT_MODES.find((mode) => mode.value === value)?.label || value;
  };

  const onSubmit = (data: PayReceiptFormData) => {
    const submitData = {
      ...data,
      amount: parseFloat(data.amount),
    };

    if (editingId) {
      updateReceipt.mutate({ ...submitData, id: editingId }, {
        onSuccess: () => {
          setIsDialogOpen(false);
          setEditingId(null);
          form.reset();
        },
      });
    } else {
      createReceipt.mutate(submitData, {
        onSuccess: () => {
          setIsDialogOpen(false);
          form.reset();
        },
      });
    }
  };

  const handleEdit = (receipt: (typeof receipts)[0]) => {
    setEditingId(receipt.id);
    form.reset({
      site_id: receipt.site_id,
      date: receipt.date,
      amount: String(receipt.amount),
      payment_mode: receipt.payment_mode as "cash" | "gpay" | "bank",
      notes: receipt.notes || "",
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this pay receipt?")) {
      deleteReceipt.mutate(id);
    }
  };

  const handleAddNew = () => {
    setEditingId(null);
    form.reset({
      site_id: "",
      date: format(new Date(), "yyyy-MM-dd"),
      amount: "",
      payment_mode: "cash",
      notes: "",
    });
    setIsDialogOpen(true);
  };

  // Check if user has permission (Admin or Office Manager only)
  const hasPermission = profile?.role === "admin" || profile?.role === "office_manager";

  if (!hasPermission) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-4">Pay Receipts</h1>
        <p className="text-muted-foreground">
          You do not have permission to view this page.
        </p>
      </div>
    );
  }

  const isSubmitting = createReceipt.isPending || updateReceipt.isPending;

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold">Pay Receipts</h1>
        <Button onClick={handleAddNew} className="w-full sm:w-auto min-h-11">
          <Plus className="h-4 w-4 mr-2" />
          Add Receipt
        </Button>
      </div>

      {/* Site Filter */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="w-full sm:w-64">
          <Select
            value={selectedSiteId}
            onValueChange={setSelectedSiteId}
          >
            <SelectTrigger className="min-h-11">
              <SelectValue placeholder="Filter by site..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Sites</SelectItem>
              {sites.map((site) => (
                <SelectItem key={site.id} value={site.id}>
                  {site.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {selectedSiteId && (
          <Button
            variant="ghost"
            onClick={() => setSelectedSiteId("")}
            className="min-h-11"
          >
            Clear Filter
          </Button>
        )}
      </div>

      {/* Mobile Cards View */}
      <div className="md:hidden space-y-3">
        {isReceiptsLoading ? (
          <div className="text-center py-8">Loading receipts...</div>
        ) : receipts.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground border rounded-md">
            No pay receipts found{selectedSiteId && " for this site"}
          </div>
        ) : (
          <>
            {receipts.map((receipt) => (
              <Card key={receipt.id} className="min-h-11">
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-start justify-between">
                    <div className="min-h-11 flex flex-col justify-center">
                      <div className="font-medium text-slate-900">
                        {receipt.sites?.name || "Unknown Site"}
                      </div>
                      <div className="text-sm text-slate-500">
                        {formatDate(receipt.date)}
                      </div>
                    </div>
                    <Badge variant="secondary" className="capitalize">
                      {getPaymentModeLabel(receipt.payment_mode)}
                    </Badge>
                  </div>
                  <div className="pt-2 border-t flex items-center justify-between">
                    <span className="text-sm text-slate-500">Amount</span>
                    <span className="font-mono font-bold text-lg">
                      {formatAmount(Number(receipt.amount))}
                    </span>
                  </div>
                  {receipt.notes && (
                    <div className="text-sm text-muted-foreground">
                      {receipt.notes}
                    </div>
                  )}
                  <div className="flex items-center gap-2 pt-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(receipt)}
                      className="min-h-11 flex-1"
                    >
                      <Pencil className="h-4 w-4 mr-2" />
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(receipt.id)}
                      className="min-h-11 flex-1"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
            {/* Running Total Card */}
            <Card className="bg-muted/50 border-primary/20">
              <CardContent className="p-4 flex items-center justify-between">
                <span className="font-bold">Total{selectedSiteId ? " for this site" : ""}</span>
                <span className="font-bold font-mono text-lg">
                  {formatAmount(runningTotal)}
                </span>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Site</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Payment Mode</TableHead>
              <TableHead>Notes</TableHead>
              <TableHead className="w-24">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isReceiptsLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">
                  Loading receipts...
                </TableCell>
              </TableRow>
            ) : receipts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  No pay receipts found
                  {selectedSiteId && " for this site"}
                </TableCell>
              </TableRow>
            ) : (
              <>
                {receipts.map((receipt) => (
                  <TableRow key={receipt.id}>
                    <TableCell>{formatDate(receipt.date)}</TableCell>
                    <TableCell>{receipt.sites?.name || "Unknown Site"}</TableCell>
                    <TableCell className="font-medium">
                      {formatAmount(Number(receipt.amount))}
                    </TableCell>
                    <TableCell>{getPaymentModeLabel(receipt.payment_mode)}</TableCell>
                    <TableCell className="text-muted-foreground max-w-xs truncate">
                      {receipt.notes || "-"}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(receipt)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(receipt.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {/* Running Total Row */}
                <TableRow className="border-t-2 border-t-primary/20 bg-muted/50">
                  <TableCell colSpan={2} className="font-bold text-right">
                    Total{selectedSiteId ? " for this site" : ""}:
                  </TableCell>
                  <TableCell className="font-bold">
                    {formatAmount(runningTotal)}
                  </TableCell>
                  <TableCell colSpan={3} />
                </TableRow>
              </>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingId ? "Edit Pay Receipt" : "Add Pay Receipt"}
            </DialogTitle>
            <DialogDescription>
              {editingId
                ? "Update the pay receipt details below."
                : "Record a new payment received from a client."}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="site_id">Site</Label>
              <Select
                value={form.watch("site_id")}
                onValueChange={(value) => form.setValue("site_id", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select site..." />
                </SelectTrigger>
                <SelectContent>
                  {sites.map((site) => (
                    <SelectItem key={site.id} value={site.id}>
                      {site.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.formState.errors.site_id && (
                <p className="text-sm text-red-500">
                  {form.formState.errors.site_id.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="date">Date</Label>
              <Input
                id="date"
                type="date"
                {...form.register("date")}
              />
              {form.formState.errors.date && (
                <p className="text-sm text-red-500">
                  {form.formState.errors.date.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount">
                <IndianRupee className="inline h-4 w-4 mr-1" />
                Amount
              </Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0.01"
                placeholder="Enter amount"
                {...form.register("amount")}
              />
              {form.formState.errors.amount && (
                <p className="text-sm text-red-500">
                  {form.formState.errors.amount.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="payment_mode">Payment Mode</Label>
              <Select
                value={form.watch("payment_mode")}
                onValueChange={(value: "cash" | "gpay" | "bank") =>
                  form.setValue("payment_mode", value)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select payment mode..." />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_MODES.map((mode) => (
                    <SelectItem key={mode.value} value={mode.value}>
                      {mode.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.formState.errors.payment_mode && (
                <p className="text-sm text-red-500">
                  {form.formState.errors.payment_mode.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes (optional)</Label>
              <Input
                id="notes"
                placeholder="Add any notes..."
                {...form.register("notes")}
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Saving..." : editingId ? "Update" : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
