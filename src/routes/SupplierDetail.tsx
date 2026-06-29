import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useSingleSupplier } from "@/hooks/useSingleSupplier";
import { usePurchaseOrders, type PurchaseOrder } from "@/hooks/usePurchaseOrders";
import { useCreatePurchaseOrder, type CreatePurchaseOrderData } from "@/hooks/useCreatePurchaseOrder";
import { useUpdatePurchaseOrder, type UpdatePurchaseOrderData } from "@/hooks/useUpdatePurchaseOrder";
import { useBills } from "@/hooks/useBills";
import { useCreateBill, type CreateBillData } from "@/hooks/useCreateBill";
import { useBillsForSupplier, type BillForSupplier } from "@/hooks/useBillsForSupplier";
import { useSupplierPayments } from "@/hooks/useSupplierPayments";
import { useCreateSupplierPayment, type CreateSupplierPaymentData } from "@/hooks/useCreateSupplierPayment";
import { useSites } from "@/hooks/useSites";
import { useAuthStore } from "@/stores/authStore";
import { ArrowLeft, Plus, Pencil, ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format } from "date-fns";

interface PurchaseOrderFormData {
  site_id: string;
  description: string;
  total_amount: number | null;
  order_date: string;
  status: "pending" | "approved" | "received" | "cancelled";
}

interface BillFormData {
  bill_number: string;
  bill_date: string;
  amount: number;
}

const paymentSchema = z.object({
  bill_id: z.string().min(1, "Bill is required"),
  amount: z.number().positive("Amount must be positive"),
  payment_date: z.string().min(1, "Payment date is required"),
  payment_mode: z.enum(["cash", "gpay", "bank"]),
});

interface PaymentFormData {
  bill_id: string;
  amount: number;
  payment_date: string;
  payment_mode: "cash" | "gpay" | "bank";
}

export default function SupplierDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { profile } = useAuthStore();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPo, setEditingPo] = useState<PurchaseOrder | null>(null);
  const [expandedPoId, setExpandedPoId] = useState<string | null>(null);
  const [isBillDialogOpen, setIsBillDialogOpen] = useState(false);
  const [selectedPoId, setSelectedPoId] = useState<string | null>(null);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);

  const { data: supplier, isLoading: isLoadingSupplier } = useSingleSupplier(id || "");
  const { data: purchaseOrders = [], isLoading: isLoadingOrders } = usePurchaseOrders(id || "");
  const { data: sites = [] } = useSites();
  const { data: supplierBills = [] } = useBillsForSupplier(id || "");
  const { data: payments = [], isLoading: isLoadingPayments } = useSupplierPayments(id || "");
  const createPO = useCreatePurchaseOrder();
  const updatePO = useUpdatePurchaseOrder();
  const createBill = useCreateBill();
  const createPayment = useCreateSupplierPayment();

  const poForm = useForm<PurchaseOrderFormData>({
    defaultValues: {
      site_id: "",
      description: "",
      total_amount: null,
      order_date: new Date().toISOString().split("T")[0],
      status: "pending",
    },
  });

  const billForm = useForm<BillFormData>({
    defaultValues: {
      bill_number: "",
      bill_date: new Date().toISOString().split("T")[0],
      amount: 0,
    },
  });

  const paymentForm = useForm<PaymentFormData>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      bill_id: "",
      amount: 0,
      payment_date: new Date().toISOString().split("T")[0],
      payment_mode: "cash",
    },
  });

  // Format amount to Indian Rupees
  const formatAmount = (amount: number | null) => {
    if (amount === null) return "-";
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Format payment mode for display
  const formatPaymentMode = (mode: string) => {
    const modeMap: Record<string, string> = {
      cash: "Cash",
      gpay: "GPay",
      bank: "Bank Transfer",
    };
    return modeMap[mode] || mode;
  };

  // Get status badge classes
  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800 hover:bg-yellow-100";
      case "approved":
        return "bg-blue-100 text-blue-800 hover:bg-blue-100";
      case "received":
        return "bg-green-100 text-green-800 hover:bg-green-100";
      case "cancelled":
        return "bg-red-100 text-red-800 hover:bg-red-100";
      default:
        return "";
    }
  };

  // Format bill label for dropdown
  const getBillLabel = (bill: BillForSupplier) => {
    const poDesc = bill.purchase_order?.description || "Unknown PO";
    const billNum = bill.bill_number ? `Bill #${bill.bill_number}` : "Bill";
    const date = format(new Date(bill.bill_date), "dd MMM yyyy");
    return `${poDesc} — ${billNum} (${date})`;
  };

  const onSubmitPO = (data: PurchaseOrderFormData) => {
    if (editingPo) {
      const updateData: UpdatePurchaseOrderData = {
        id: editingPo.id,
        ...data,
      };
      updatePO.mutate(updateData, {
        onSuccess: () => {
          setIsDialogOpen(false);
          setEditingPo(null);
          poForm.reset();
        },
      });
    } else {
      if (!id) return;
      const createData: CreatePurchaseOrderData = {
        ...data,
        supplier_id: id,
      };
      createPO.mutate(createData, {
        onSuccess: () => {
          setIsDialogOpen(false);
          poForm.reset();
        },
      });
    }
  };

  const onSubmitBill = (data: BillFormData) => {
    if (!selectedPoId) return;
    
    const billData: CreateBillData = {
      purchase_order_id: selectedPoId,
      bill_number: data.bill_number || undefined,
      bill_date: data.bill_date,
      amount: data.amount,
    };
    
    createBill.mutate(billData, {
      onSuccess: () => {
        setIsBillDialogOpen(false);
        setSelectedPoId(null);
        billForm.reset();
      },
    });
  };

  const onSubmitPayment = (data: PaymentFormData) => {
    if (!id) return;
    
    const paymentData: CreateSupplierPaymentData = {
      bill_id: data.bill_id,
      supplier_id: id,
      amount: data.amount,
      payment_date: data.payment_date,
      payment_mode: data.payment_mode,
    };
    
    createPayment.mutate(paymentData, {
      onSuccess: () => {
        setIsPaymentDialogOpen(false);
        paymentForm.reset();
      },
    });
  };

  const handleEditPO = (po: PurchaseOrder) => {
    setEditingPo(po);
    poForm.reset({
      site_id: po.site_id,
      description: po.description,
      total_amount: po.total_amount,
      order_date: po.order_date,
      status: po.status,
    });
    setIsDialogOpen(true);
  };

  const handleAddNewPO = () => {
    setEditingPo(null);
    poForm.reset({
      site_id: "",
      description: "",
      total_amount: null,
      order_date: new Date().toISOString().split("T")[0],
      status: "pending",
    });
    setIsDialogOpen(true);
  };

  const handleAddBill = (poId: string) => {
    setSelectedPoId(poId);
    billForm.reset({
      bill_number: "",
      bill_date: new Date().toISOString().split("T")[0],
      amount: 0,
    });
    setIsBillDialogOpen(true);
  };

  const handleAddPayment = () => {
    paymentForm.reset({
      bill_id: "",
      amount: 0,
      payment_date: new Date().toISOString().split("T")[0],
      payment_mode: "cash",
    });
    setIsPaymentDialogOpen(true);
  };

  const toggleExpand = (poId: string) => {
    setExpandedPoId(expandedPoId === poId ? null : poId);
  };

  // Check if user has permission
  const hasPermission = profile?.role === "admin" || profile?.role === "office_manager";

  if (!hasPermission) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-4">Supplier Details</h1>
        <p className="text-muted-foreground">
          You do not have permission to view this page.
        </p>
      </div>
    );
  }

  if (isLoadingSupplier) {
    return (
      <div className="p-6">
        <div className="text-center py-8">Loading supplier details...</div>
      </div>
    );
  }

  if (!supplier) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-4">Supplier Not Found</h1>
        <Button onClick={() => navigate("/suppliers")} variant="outline">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Suppliers
        </Button>
      </div>
    );
  }

  const isPoSubmitting = createPO.isPending || updatePO.isPending;
  const isBillSubmitting = createBill.isPending;
  const isPaymentSubmitting = createPayment.isPending;

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6">
      {/* Header with back button */}
      <div className="flex items-center gap-4">
        <Button onClick={() => navigate("/suppliers")} variant="outline" size="sm" className="w-full md:w-auto">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Suppliers
        </Button>
      </div>

      {/* Supplier Info - Desktop */}
      <div className="hidden md:block space-y-2">
        <h1 className="text-2xl font-bold">{supplier.name}</h1>
        <div className="text-sm text-muted-foreground space-y-1">
          {supplier.contact_phone && <p>Phone: {supplier.contact_phone}</p>}
          {supplier.contact_email && <p>Email: {supplier.contact_email}</p>}
          {supplier.materials_supplied && <p>Materials: {supplier.materials_supplied}</p>}
        </div>
        <div className="pt-2">
          <span className="text-sm text-muted-foreground">Balance Owed: </span>
          <span
            className={`font-semibold ${
              supplier.balance_owed > 0 ? "text-red-600" : "text-green-600"
            }`}
          >
            {formatAmount(supplier.balance_owed)}
          </span>
        </div>
      </div>

      {/* Supplier Info - Mobile Card */}
      <div className="md:hidden">
        <div className="border rounded-lg p-4 space-y-3 bg-card">
          <h1 className="text-xl font-bold">{supplier.name}</h1>
          <div className="space-y-2 text-sm">
            {supplier.contact_phone && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Phone</span>
                <span>{supplier.contact_phone}</span>
              </div>
            )}
            {supplier.contact_email && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Email</span>
                <span>{supplier.contact_email}</span>
              </div>
            )}
            {supplier.materials_supplied && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Materials</span>
                <span className="text-right">{supplier.materials_supplied}</span>
              </div>
            )}
            <div className="flex justify-between pt-2 border-t">
              <span className="text-muted-foreground">Balance Owed</span>
              <span
                className={`font-bold ${
                  supplier.balance_owed > 0 ? "text-red-600" : "text-green-600"
                }`}
              >
                {formatAmount(supplier.balance_owed)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Purchase Orders Section */}
      <div className="pt-6 border-t">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-4 gap-3">
          <h2 className="text-xl font-semibold">Purchase Orders</h2>
          <Button onClick={handleAddNewPO} className="w-full md:w-auto">
            <Plus className="h-4 w-4 mr-2" />
            Add Purchase Order
          </Button>
        </div>

        {/* PO Table - Desktop */}
        <div className="hidden md:block border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8"></TableHead>
                <TableHead>Order Date</TableHead>
                <TableHead>Site</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Total Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-16">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoadingOrders ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    Loading purchase orders...
                  </TableCell>
                </TableRow>
              ) : purchaseOrders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No purchase orders found
                  </TableCell>
                </TableRow>
              ) : (
                purchaseOrders.map((po) => (
                  <PurchaseOrderRow
                    key={po.id}
                    po={po}
                    isExpanded={expandedPoId === po.id}
                    onToggle={() => toggleExpand(po.id)}
                    onEdit={handleEditPO}
                    onAddBill={handleAddBill}
                    formatAmount={formatAmount}
                    getStatusBadgeClass={getStatusBadgeClass}
                  />
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* PO Cards - Mobile */}
        <div className="md:hidden space-y-4">
          {isLoadingOrders ? (
            <div className="text-center py-8">Loading purchase orders...</div>
          ) : purchaseOrders.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground border rounded-md">
              No purchase orders found
            </div>
          ) : (
            purchaseOrders.map((po) => (
              <PurchaseOrderCard
                key={po.id}
                po={po}
                isExpanded={expandedPoId === po.id}
                onToggle={() => toggleExpand(po.id)}
                onEdit={handleEditPO}
                onAddBill={handleAddBill}
                formatAmount={formatAmount}
                getStatusBadgeClass={getStatusBadgeClass}
              />
            ))
          )}
        </div>
      </div>

      {/* Payments Section */}
      <div className="pt-6 border-t">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-4 gap-3">
          <h2 className="text-xl font-semibold">Payments</h2>
          <Button onClick={handleAddPayment} className="w-full md:w-auto">
            <Plus className="h-4 w-4 mr-2" />
            Add Payment
          </Button>
        </div>

        {/* Payments Table - Desktop */}
        <div className="hidden md:block border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Payment Date</TableHead>
                <TableHead>Bill</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Payment Mode</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoadingPayments ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8">
                    Loading payments...
                  </TableCell>
                </TableRow>
              ) : payments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                    No payments recorded
                  </TableCell>
                </TableRow>
              ) : (
                payments.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell>
                      {format(new Date(payment.payment_date), "dd MMM yyyy")}
                    </TableCell>
                    <TableCell>
                      {payment.bill?.bill_number
                        ? `Bill #${payment.bill.bill_number}`
                        : `Bill on ${payment.bill
                            ? format(new Date(payment.bill.bill_date), "dd MMM yyyy")
                            : "—"}`}
                    </TableCell>
                    <TableCell>{formatAmount(payment.amount)}</TableCell>
                    <TableCell>{formatPaymentMode(payment.payment_mode)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Payments Cards - Mobile */}
        <div className="md:hidden space-y-4">
          {isLoadingPayments ? (
            <div className="text-center py-8">Loading payments...</div>
          ) : payments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground border rounded-md">
              No payments recorded
            </div>
          ) : (
            payments.map((payment) => (
              <div key={payment.id} className="border rounded-lg p-4 space-y-3 bg-card">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(payment.payment_date), "dd MMM yyyy")}
                    </p>
                    <p className="text-sm font-medium">
                      {payment.bill?.bill_number
                        ? `Bill #${payment.bill.bill_number}`
                        : `Bill on ${payment.bill
                            ? format(new Date(payment.bill.bill_date), "dd MMM yyyy")
                            : "—"}`}
                    </p>
                  </div>
                  <p className="text-lg font-bold">{formatAmount(payment.amount)}</p>
                </div>
                <div className="text-sm">
                  <span className="text-muted-foreground">Payment Mode:</span>{" "}
                  <span className="font-medium">{formatPaymentMode(payment.payment_mode)}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* PO Add/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingPo ? "Edit Purchase Order" : "Add Purchase Order"}
            </DialogTitle>
            <DialogDescription>
              {editingPo
                ? "Update the purchase order details below."
                : "Create a new purchase order for this supplier."}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={poForm.handleSubmit(onSubmitPO)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="site_id">
                Site <span className="text-red-500">*</span>
              </Label>
              <Select
                value={poForm.watch("site_id")}
                onValueChange={(value) => poForm.setValue("site_id", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a site" />
                </SelectTrigger>
                <SelectContent>
                  {sites.map((site) => (
                    <SelectItem key={site.id} value={site.id}>
                      {site.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">
                Description <span className="text-red-500">*</span>
              </Label>
              <Input
                id="description"
                placeholder="Enter order description"
                {...poForm.register("description")}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="total_amount">Total Amount (₹)</Label>
                <Input
                  id="total_amount"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  {...poForm.register("total_amount")}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="order_date">
                  Order Date <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="order_date"
                  type="date"
                  {...poForm.register("order_date")}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={poForm.watch("status")}
                onValueChange={(value: "pending" | "approved" | "received" | "cancelled") =>
                  poForm.setValue("status", value)
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="received">Received</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
                disabled={isPoSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isPoSubmitting}>
                {isPoSubmitting ? "Saving..." : editingPo ? "Update" : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add Bill Dialog */}
      <Dialog open={isBillDialogOpen} onOpenChange={setIsBillDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Bill</DialogTitle>
            <DialogDescription>
              Record a new bill for this purchase order.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={billForm.handleSubmit(onSubmitBill)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="bill_number">Bill Number</Label>
              <Input
                id="bill_number"
                placeholder="Enter bill number"
                {...billForm.register("bill_number")}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="bill_date">
                Bill Date <span className="text-red-500">*</span>
              </Label>
              <Input
                id="bill_date"
                type="date"
                {...billForm.register("bill_date")}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount">
                Amount (₹) <span className="text-red-500">*</span>
              </Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                placeholder="0.00"
                {...billForm.register("amount", { valueAsNumber: true })}
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsBillDialogOpen(false)}
                disabled={isBillSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isBillSubmitting}>
                {isBillSubmitting ? "Saving..." : "Add Bill"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add Payment Dialog */}
      <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Payment</DialogTitle>
            <DialogDescription>
              Record a new payment to this supplier.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={paymentForm.handleSubmit(onSubmitPayment)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="bill_id">
                Bill <span className="text-red-500">*</span>
              </Label>
              <Select
                value={paymentForm.watch("bill_id")}
                onValueChange={(value) => paymentForm.setValue("bill_id", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a bill" />
                </SelectTrigger>
                <SelectContent>
                  {supplierBills.map((bill) => (
                    <SelectItem key={bill.id} value={bill.id}>
                      {getBillLabel(bill)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {paymentForm.formState.errors.bill_id && (
                <p className="text-sm text-red-500">
                  {paymentForm.formState.errors.bill_id.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="payment_amount">
                Amount (₹) <span className="text-red-500">*</span>
              </Label>
              <Input
                id="payment_amount"
                type="number"
                step="0.01"
                placeholder="0.00"
                {...paymentForm.register("amount", { valueAsNumber: true })}
              />
              {paymentForm.formState.errors.amount && (
                <p className="text-sm text-red-500">
                  {paymentForm.formState.errors.amount.message}
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="payment_date">
                  Payment Date <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="payment_date"
                  type="date"
                  {...paymentForm.register("payment_date")}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="payment_mode">Payment Mode</Label>
                <Select
                  value={paymentForm.watch("payment_mode")}
                  onValueChange={(value: "cash" | "gpay" | "bank") =>
                    paymentForm.setValue("payment_mode", value)
                  }
                >
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
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsPaymentDialogOpen(false)}
                disabled={isPaymentSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isPaymentSubmitting}>
                {isPaymentSubmitting ? "Saving..." : "Add Payment"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Sub-component for a purchase order row (including expandable bills section)
interface PurchaseOrderRowProps {
  po: PurchaseOrder;
  isExpanded: boolean;
  onToggle: () => void;
  onEdit: (po: PurchaseOrder) => void;
  onAddBill: (poId: string) => void;
  formatAmount: (amount: number | null) => string;
  getStatusBadgeClass: (status: string) => string;
}

// Sub-component for a purchase order card (mobile view)
interface PurchaseOrderCardProps {
  po: PurchaseOrder;
  isExpanded: boolean;
  onToggle: () => void;
  onEdit: (po: PurchaseOrder) => void;
  onAddBill: (poId: string) => void;
  formatAmount: (amount: number | null) => string;
  getStatusBadgeClass: (status: string) => string;
}

function PurchaseOrderCard({
  po,
  isExpanded,
  onToggle,
  onEdit,
  onAddBill,
  formatAmount,
  getStatusBadgeClass,
}: PurchaseOrderCardProps) {
  const { data: bills = [], isLoading: isLoadingBills } = useBills(po.id);

  return (
    <div className="border rounded-lg p-4 space-y-3 bg-card">
      {/* Card Header */}
      <div className="space-y-2">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-xs text-muted-foreground">
              {format(new Date(po.order_date), "dd MMM yyyy")}
            </p>
            <p className="text-sm font-medium">{po.site?.name || "-"}</p>
          </div>
          <Badge variant="outline" className={getStatusBadgeClass(po.status)}>
            {po.status.charAt(0).toUpperCase() + po.status.slice(1)}
          </Badge>
        </div>
        <p className="text-sm">{po.description}</p>
        <p className="text-lg font-bold">{formatAmount(po.total_amount)}</p>
      </div>

      {/* Card Actions */}
      <div className="flex items-center justify-between pt-2 border-t">
        <Button
          variant="ghost"
          size="sm"
          className="flex items-center gap-1 text-muted-foreground"
          onClick={onToggle}
        >
          {isExpanded ? (
            <>
              <ChevronDown className="h-4 w-4" /> Hide Bills
            </>
          ) : (
            <>
              <ChevronRight className="h-4 w-4" /> View Bills
            </>
          )}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onEdit(po)}
        >
          <Pencil className="h-4 w-4" />
        </Button>
      </div>

      {/* Expanded Bills Section */}
      {isExpanded && (
        <div className="pt-2">
          <div className="border rounded-md bg-muted/30 space-y-2">
            <div className="px-3 py-2 border-b flex items-center justify-between bg-muted/50">
              <h4 className="font-semibold text-sm">Bills</h4>
              {po.status !== "cancelled" && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onAddBill(po.id)}
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Add Bill
                </Button>
              )}
            </div>
            <div className="p-2">
              {isLoadingBills ? (
                <div className="text-center py-4 text-sm">Loading bills...</div>
              ) : bills.length === 0 ? (
                <div className="text-center py-4 text-sm text-muted-foreground">
                  No bills recorded
                </div>
              ) : (
                <div className="space-y-2">
                  {bills.map((bill) => (
                    <div
                      key={bill.id}
                      className="flex items-center justify-between p-2 bg-background rounded"
                    >
                      <div>
                        <p className="text-sm font-medium">
                          {bill.bill_number || "Bill"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(bill.bill_date), "dd MMM yyyy")}
                        </p>
                      </div>
                      <p className="text-sm font-medium">
                        {formatAmount(bill.amount)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Sub-component for a purchase order row (including expandable bills section) - Desktop
interface PurchaseOrderRowProps {
  po: PurchaseOrder;
  isExpanded: boolean;
  onToggle: () => void;
  onEdit: (po: PurchaseOrder) => void;
  onAddBill: (poId: string) => void;
  formatAmount: (amount: number | null) => string;
  getStatusBadgeClass: (status: string) => string;
}

function PurchaseOrderRow({
  po,
  isExpanded,
  onToggle,
  onEdit,
  onAddBill,
  formatAmount,
  getStatusBadgeClass,
}: PurchaseOrderRowProps) {
  const { data: bills = [], isLoading: isLoadingBills } = useBills(po.id);

  return (
    <>
      <TableRow
        className="cursor-pointer hover:bg-muted/50"
        onClick={onToggle}
      >
        <TableCell onClick={(e) => e.stopPropagation()}>
          <Button variant="ghost" size="icon" className="h-6 w-6">
            {isExpanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </Button>
        </TableCell>
        <TableCell>{format(new Date(po.order_date), "dd MMM yyyy")}</TableCell>
        <TableCell>{po.site?.name || "-"}</TableCell>
        <TableCell className="max-w-xs truncate">{po.description}</TableCell>
        <TableCell>{formatAmount(po.total_amount)}</TableCell>
        <TableCell>
          <Badge variant="outline" className={getStatusBadgeClass(po.status)}>
            {po.status.charAt(0).toUpperCase() + po.status.slice(1)}
          </Badge>
        </TableCell>
        <TableCell>
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              onEdit(po);
            }}
          >
            <Pencil className="h-4 w-4" />
          </Button>
        </TableCell>
      </TableRow>

      {/* Expanded Bills Section */}
      {isExpanded && (
        <TableRow>
          <TableCell colSpan={7} className="bg-muted/30 p-0">
            <div className="p-4 space-y-4">
              {/* Bills Table */}
              <div className="border rounded-md bg-background">
                <div className="px-4 py-2 border-b flex items-center justify-between bg-muted/50">
                  <h4 className="font-semibold text-sm">Bills</h4>
                  {po.status !== "cancelled" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onAddBill(po.id)}
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Add Bill
                    </Button>
                  )}
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Bill Number</TableHead>
                      <TableHead className="text-xs">Bill Date</TableHead>
                      <TableHead className="text-xs">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoadingBills ? (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center py-4 text-sm">
                          Loading bills...
                        </TableCell>
                      </TableRow>
                    ) : bills.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center py-4 text-sm text-muted-foreground">
                          No bills recorded
                        </TableCell>
                      </TableRow>
                    ) : (
                      bills.map((bill) => (
                        <TableRow key={bill.id}>
                          <TableCell className="text-sm">
                            {bill.bill_number || "-"}
                          </TableCell>
                          <TableCell className="text-sm">
                            {format(new Date(bill.bill_date), "dd MMM yyyy")}
                          </TableCell>
                          <TableCell className="text-sm">
                            {formatAmount(bill.amount)}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </TableCell>
        </TableRow>
      )}
    </>
  );
}
