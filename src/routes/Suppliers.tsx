import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useSuppliers, type SupplierBalance } from "@/hooks/useSuppliers";
import { useCreateSupplier, type CreateSupplierData } from "@/hooks/useCreateSupplier";
import { useUpdateSupplier, type UpdateSupplierData } from "@/hooks/useUpdateSupplier";
import { useAuthStore } from "@/stores/authStore";
import { Plus, Pencil } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";

const supplierSchema = z.object({
  name: z.string().min(1, "Name is required"),
  contact_phone: z.string(),
  contact_email: z.string().email("Invalid email").or(z.string().length(0)),
  materials_supplied: z.string(),
  is_active: z.boolean(),
});

interface SupplierFormData {
  name: string;
  contact_phone: string;
  contact_email: string;
  materials_supplied: string;
  is_active: boolean;
}

export default function Suppliers() {
  const navigate = useNavigate();
  const { profile } = useAuthStore();

  const handleRowClick = (supplierId: string) => {
    navigate(`/suppliers/${supplierId}`);
  };
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const { data: suppliers = [], isLoading } = useSuppliers();
  const createSupplier = useCreateSupplier();
  const updateSupplier = useUpdateSupplier();

  const form = useForm<SupplierFormData>({
    resolver: zodResolver(supplierSchema),
    defaultValues: {
      name: "",
      contact_phone: "",
      contact_email: "",
      materials_supplied: "",
      is_active: true,
    },
  });

  // Format amount to Indian Rupees
  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const onSubmit = (data: SupplierFormData) => {
    if (editingId) {
      const updateData: UpdateSupplierData = {
        ...data,
        id: editingId,
      };
      updateSupplier.mutate(updateData, {
        onSuccess: () => {
          setIsDialogOpen(false);
          setEditingId(null);
          form.reset();
        },
      });
    } else {
      const createData: CreateSupplierData = data;
      createSupplier.mutate(createData, {
        onSuccess: () => {
          setIsDialogOpen(false);
          form.reset();
        },
      });
    }
  };

  const handleEdit = (supplier: SupplierBalance) => {
    setEditingId(supplier.supplier_id);
    form.reset({
      name: supplier.name,
      contact_phone: supplier.contact_phone || "",
      contact_email: supplier.contact_email || "",
      materials_supplied: supplier.materials_supplied || "",
      is_active: supplier.is_active,
    });
    setIsDialogOpen(true);
  };

  const handleAddNew = () => {
    setEditingId(null);
    form.reset({
      name: "",
      contact_phone: "",
      contact_email: "",
      materials_supplied: "",
      is_active: true,
    });
    setIsDialogOpen(true);
  };

  // Check if user has permission (Admin or Office Manager only)
  const hasPermission = profile?.role === "admin" || profile?.role === "office_manager";

  if (!hasPermission) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-4">Suppliers</h1>
        <p className="text-muted-foreground">
          You do not have permission to view this page.
        </p>
      </div>
    );
  }

  const isSubmitting = createSupplier.isPending || updateSupplier.isPending;

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold">Suppliers</h1>
        <Button onClick={handleAddNew} className="w-full sm:w-auto min-h-11">
          <Plus className="h-4 w-4 mr-2" />
          Add Supplier
        </Button>
      </div>

      {/* Mobile Cards View */}
      <div className="md:hidden space-y-3">
        {isLoading ? (
          <div className="text-center py-8">Loading suppliers...</div>
        ) : suppliers.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground border rounded-md">
            No suppliers found
          </div>
        ) : (
          suppliers.map((supplier) => (
            <Card
              key={supplier.supplier_id}
              className="min-h-11 cursor-pointer"
              onClick={() => handleRowClick(supplier.supplier_id)}
            >
              <CardContent className="p-4 space-y-2">
                <div className="flex items-start justify-between">
                  <div className="min-h-11 flex flex-col justify-center">
                    <div className="font-medium text-slate-900">{supplier.name}</div>
                    {supplier.contact_phone && (
                      <div className="text-sm text-slate-500">{supplier.contact_phone}</div>
                    )}
                  </div>
                  <Badge variant={supplier.is_active ? "default" : "secondary"}>
                    {supplier.is_active ? "Active" : "Inactive"}
                  </Badge>
                </div>
                {supplier.materials_supplied && (
                  <div className="text-sm text-slate-600 line-clamp-2">
                    {supplier.materials_supplied}
                  </div>
                )}
                <div className="pt-2 border-t flex items-center justify-between">
                  <span className="text-sm text-slate-500">Balance</span>
                  <span className={`font-mono font-medium ${supplier.balance_owed > 0 ? "text-red-600" : ""}`}>
                    {formatAmount(supplier.balance_owed)}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleEdit(supplier);
                  }}
                  className="min-h-11 w-full"
                >
                  <Pencil className="h-4 w-4 mr-2" />
                  Edit
                </Button>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Contact Phone</TableHead>
              <TableHead>Contact Email</TableHead>
              <TableHead>Materials Supplied</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Balance Owed</TableHead>
              <TableHead className="w-16">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8">
                  Loading suppliers...
                </TableCell>
              </TableRow>
            ) : suppliers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  No suppliers found
                </TableCell>
              </TableRow>
            ) : (
              suppliers.map((supplier) => (
                <TableRow
                  key={supplier.supplier_id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => handleRowClick(supplier.supplier_id)}
                >
                  <TableCell className="font-medium">{supplier.name}</TableCell>
                  <TableCell>{supplier.contact_phone || "-"}</TableCell>
                  <TableCell>{supplier.contact_email || "-"}</TableCell>
                  <TableCell className="max-w-xs truncate">
                    {supplier.materials_supplied || "-"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={supplier.is_active ? "default" : "secondary"}>
                      {supplier.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell className={supplier.balance_owed > 0 ? "text-red-600 font-medium" : ""}>
                    {formatAmount(supplier.balance_owed)}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEdit(supplier);
                      }}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingId ? "Edit Supplier" : "Add Supplier"}
            </DialogTitle>
            <DialogDescription>
              {editingId
                ? "Update the supplier details below."
                : "Add a new material supplier to the system."}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">
                Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="name"
                placeholder="Enter supplier name"
                {...form.register("name")}
              />
              {form.formState.errors.name && (
                <p className="text-sm text-red-500">
                  {form.formState.errors.name.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="contact_phone">Contact Phone</Label>
              <Input
                id="contact_phone"
                type="tel"
                placeholder="Enter phone number"
                {...form.register("contact_phone")}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="contact_email">Contact Email</Label>
              <Input
                id="contact_email"
                type="email"
                placeholder="Enter email address"
                {...form.register("contact_email")}
              />
              {form.formState.errors.contact_email && (
                <p className="text-sm text-red-500">
                  {form.formState.errors.contact_email.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="materials_supplied">Materials Supplied</Label>
              <Input
                id="materials_supplied"
                placeholder="e.g., Cement, concrete mix, bricks"
                {...form.register("materials_supplied")}
              />
            </div>

            <div className="flex items-center justify-between rounded-lg border p-3">
              <div className="space-y-0.5">
                <Label htmlFor="is_active">Active Status</Label>
                <p className="text-sm text-muted-foreground">
                  {editingId
? "Deactivate to hide this supplier from new orders"
                    : "Set as active to use immediately"}
                </p>
              </div>
              <Switch
                id="is_active"
                checked={form.watch("is_active")}
                onCheckedChange={(checked) =>
                  form.setValue("is_active", checked)
                }
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
