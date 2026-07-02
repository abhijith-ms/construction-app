import { useState } from "react";
import { useMaterials, type Material } from "@/hooks/useMaterials";
import { useCreateMaterial, type CreateMaterialData } from "@/hooks/useCreateMaterial";
import { useUpdateMaterial, type UpdateMaterialData } from "@/hooks/useUpdateMaterial";
import { useStockLevels } from "@/hooks/useStockLevels";
import { useStockTransactions } from "@/hooks/useStockTransactions";
import { useCreateStockTransaction } from "@/hooks/useCreateStockTransaction";
import { useDeleteStockTransaction } from "@/hooks/useDeleteStockTransaction";
import { useMaterialUsage, type MaterialUsageRecord } from "@/hooks/useMaterialUsage";
import { useCreateMaterialUsage, type CreateMaterialUsageInput } from "@/hooks/useCreateMaterialUsage";
import { useApproveMaterialUsage } from "@/hooks/useApproveMaterialUsage";
import { useDeleteMaterialUsage } from "@/hooks/useDeleteMaterialUsage";
import { useSites } from "@/hooks/useSites";
import { useAssignedSites } from "@/hooks/useAssignedSites";
import { useAuthStore } from "@/stores/authStore";
import { Plus, Pencil, Package, Layers, RefreshCw, Trash2, ArrowUpCircle, ArrowDownCircle, Hammer, CheckCircle, Clock } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

// Transaction form data interface
interface TransactionFormData {
  site_id: string;
  material_id: string;
  transaction_type: "receipt" | "usage";
  quantity: number;
  reference_note?: string;
}

// Format date helper
function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

// Materials Tab Component
function MaterialsTab() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: "", unit: "", is_active: true });
  const [errors, setErrors] = useState<{ name?: string; unit?: string }>({});

  const { data: materials = [], isLoading } = useMaterials(true);
  const createMaterial = useCreateMaterial();
  const updateMaterial = useUpdateMaterial();

  const validate = () => {
    const newErrors: { name?: string; unit?: string } = {};
    if (!formData.name.trim()) newErrors.name = "Name is required";
    if (!formData.unit.trim()) newErrors.unit = "Unit is required";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    if (editingId) {
      const updateData: UpdateMaterialData = { ...formData };
      updateMaterial.mutate(
        { id: editingId, data: updateData },
        {
          onSuccess: () => {
            setIsDialogOpen(false);
            setEditingId(null);
            setFormData({ name: "", unit: "", is_active: true });
          },
        }
      );
    } else {
      const createData: CreateMaterialData = formData;
      createMaterial.mutate(createData, {
        onSuccess: () => {
          setIsDialogOpen(false);
          setEditingId(null);
          setFormData({ name: "", unit: "", is_active: true });
        },
      });
    }
  };

  const handleEdit = (material: Material) => {
    setEditingId(material.id);
    setFormData({
      name: material.name,
      unit: material.unit,
      is_active: material.is_active,
    });
    setIsDialogOpen(true);
  };

  const handleAddNew = () => {
    setEditingId(null);
    setFormData({ name: "", unit: "", is_active: true });
    setErrors({});
    setIsDialogOpen(true);
  };

  const handleToggleActive = (material: Material) => {
    updateMaterial.mutate({
      id: material.id,
      data: { is_active: !material.is_active },
    });
  };

  const isSubmitting = createMaterial.isPending || updateMaterial.isPending;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end">
        <Button onClick={handleAddNew} className="w-full sm:w-auto min-h-11">
          <Plus className="h-4 w-4 mr-2" />
          Add Material
        </Button>
      </div>

      {/* Mobile Cards View */}
      <div className="md:hidden space-y-3">
        {isLoading ? (
          <div className="text-center py-8">Loading materials...</div>
        ) : materials.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground border rounded-md">
            No materials found. Add your first material to get started.
          </div>
        ) : (
          materials.map((material) => (
            <Card key={material.id} className="min-h-11">
              <CardContent className="p-4 space-y-2">
                <div className="flex items-start justify-between">
                  <div className="min-h-11 flex flex-col justify-center">
                    <div className="font-medium text-slate-900">{material.name}</div>
                    <div className="text-sm text-slate-500">{material.unit}</div>
                  </div>
                  <Badge variant={material.is_active ? "default" : "secondary"}>
                    {material.is_active ? "Active" : "Inactive"}
                  </Badge>
                </div>
                <div className="flex items-center gap-2 pt-2 border-t">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEdit(material)}
                    className="min-h-11 flex-1"
                  >
                    <Pencil className="h-4 w-4 mr-2" />
                    Edit
                  </Button>
                  <Switch
                    checked={material.is_active}
                    onCheckedChange={() => handleToggleActive(material)}
                    aria-label={`Toggle ${material.name} active status`}
                  />
                </div>
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
              <TableHead>Unit</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-32">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8">
                  Loading materials...
                </TableCell>
              </TableRow>
            ) : materials.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                  No materials found. Add your first material to get started.
                </TableCell>
              </TableRow>
            ) : (
              materials.map((material) => (
                <TableRow key={material.id}>
                  <TableCell className="font-medium text-slate-900">{material.name}</TableCell>
                  <TableCell className="text-slate-900">{material.unit}</TableCell>
                  <TableCell>
                    <Badge variant={material.is_active ? "default" : "secondary"}>
                      {material.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(material)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Switch
                        checked={material.is_active}
                        onCheckedChange={() => handleToggleActive(material)}
                        aria-label={`Toggle ${material.name} active status`}
                      />
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Material" : "Add Material"}</DialogTitle>
            <DialogDescription>
              {editingId
                ? "Update the material details below."
                : "Enter the details for the new material."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  placeholder="e.g., Cement, Sand, Steel"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
                {errors.name && (
                  <p className="text-sm text-red-500">{errors.name}</p>
                )}
              </div>
              <div className="grid gap-2">
                <Label htmlFor="unit">Unit</Label>
                <Input
                  id="unit"
                  placeholder="e.g., bags, kg, cubic feet, pieces"
                  value={formData.unit}
                  onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                />
                {errors.unit && (
                  <p className="text-sm text-red-500">{errors.unit}</p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
                <Label htmlFor="is_active">Active</Label>
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsDialogOpen(false);
                  setEditingId(null);
                  setFormData({ name: "", unit: "", is_active: true });
                }}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Saving..." : editingId ? "Update" : "Add"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Stock Levels Tab Component
function StockLevelsTab() {
  const [selectedSiteId, setSelectedSiteId] = useState<string>("all");
  const { data: sites = [] } = useSites();
  const { data: stockLevels = [], isLoading } = useStockLevels(
    selectedSiteId === "all" ? undefined : selectedSiteId
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Label htmlFor="site-filter" className="shrink-0">Filter by Site:</Label>
          <Select value={selectedSiteId} onValueChange={setSelectedSiteId}>
            <SelectTrigger id="site-filter" className="w-full sm:w-64 min-h-11">
              <SelectValue placeholder="Select site" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Sites</SelectItem>
              {sites
                .filter((site) => site.status !== "completed")
                .map((site) => (
                  <SelectItem key={site.id} value={site.id}>
                    {site.name}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Mobile Cards View */}
      <div className="md:hidden space-y-3">
        {isLoading ? (
          <div className="text-center py-8">Loading stock levels...</div>
        ) : stockLevels.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground border rounded-md">
            No stock recorded{selectedSiteId !== "all" ? " for selected site" : ""}.
          </div>
        ) : (
          stockLevels.map((stock) => (
            <Card key={stock.id} className="min-h-11">
              <CardContent className="p-4 space-y-2">
                <div className="min-h-11 flex flex-col justify-center">
                  <div className="font-medium text-slate-900">{stock.material_name}</div>
                  <div className="text-sm text-slate-500">{stock.site_name}</div>
                </div>
                <div className="pt-2 border-t flex items-center justify-between">
                  <span className="text-sm text-slate-500">
                    {stock.material_unit}
                  </span>
                  <span className="font-mono font-bold text-lg">
                    {stock.quantity_on_hand.toLocaleString("en-IN")}
                  </span>
                </div>
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
              <TableHead>Material</TableHead>
              <TableHead>Unit</TableHead>
              <TableHead>Site</TableHead>
              <TableHead className="text-right">Quantity on Hand</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8">
                  Loading stock levels...
                </TableCell>
              </TableRow>
            ) : stockLevels.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                  No stock recorded{selectedSiteId !== "all" ? " for selected site" : ""}.
                </TableCell>
              </TableRow>
            ) : (
              stockLevels.map((stock) => (
                <TableRow key={stock.id}>
                  <TableCell className="font-medium">{stock.material_name}</TableCell>
                  <TableCell>{stock.material_unit}</TableCell>
                  <TableCell>{stock.site_name}</TableCell>
                  <TableCell className="text-right font-medium">
                    {stock.quantity_on_hand.toLocaleString("en-IN")}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

// Transactions Tab Component
function TransactionsTab() {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedSiteId, setSelectedSiteId] = useState<string>("all");
  const [transactionToDelete, setTransactionToDelete] = useState<string | null>(null);
  const [transactionToDeleteName, setTransactionToDeleteName] = useState<string>("");
  const [transactionErrors, setTransactionErrors] = useState<{
    site_id?: string;
    material_id?: string;
    quantity?: string;
  }>({});

  const { data: sites = [] } = useSites();
  const { data: materials = [] } = useMaterials(true);
  const { data: transactions = [], isLoading } = useStockTransactions(
    selectedSiteId === "all" ? undefined : selectedSiteId
  );
  const createTransaction = useCreateStockTransaction();
  const deleteTransaction = useDeleteStockTransaction();

  const [formData, setFormData] = useState<TransactionFormData>({
    site_id: "",
    material_id: "",
    transaction_type: "receipt",
    quantity: 0,
    reference_note: "",
  });

  const validateTransaction = () => {
    const newErrors: { site_id?: string; material_id?: string; quantity?: string } = {};
    if (!formData.site_id) newErrors.site_id = "Site is required";
    if (!formData.material_id) newErrors.material_id = "Material is required";
    if (!formData.quantity || formData.quantity <= 0) {
      newErrors.quantity = "Quantity must be positive";
    }
    setTransactionErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateTransaction()) return;

    createTransaction.mutate(formData, {
      onSuccess: () => {
        setIsAddDialogOpen(false);
        setFormData({
          site_id: "",
          material_id: "",
          transaction_type: "receipt",
          quantity: 0,
          reference_note: "",
        });
        setTransactionErrors({});
      },
    });
  };

  const handleAddNew = () => {
    setFormData({
      site_id: "",
      material_id: "",
      transaction_type: "receipt",
      quantity: 0,
      reference_note: "",
    });
    setTransactionErrors({});
    setIsAddDialogOpen(true);
  };

  const handleDelete = () => {
    if (transactionToDelete) {
      deleteTransaction.mutate(transactionToDelete, {
        onSuccess: () => {
          setIsDeleteDialogOpen(false);
          setTransactionToDelete(null);
          setTransactionToDeleteName("");
        },
      });
    }
  };

  const handleConfirmDelete = (transactionId: string, materialName: string) => {
    setTransactionToDelete(transactionId);
    setTransactionToDeleteName(materialName);
    setIsDeleteDialogOpen(true);
  };

  const isSubmitting = createTransaction.isPending;

  // Get display for quantity (with sign)
  const formatQuantity = (type: string, quantity: number) => {
    if (type === "receipt") {
      return `+${quantity.toLocaleString("en-IN")}`;
    } else if (type === "usage") {
      return `-${quantity.toLocaleString("en-IN")}`;
    } else if (type === "transfer_in") {
      return `+${quantity.toLocaleString("en-IN")} (transfer)`;
    } else if (type === "transfer_out") {
      return `-${quantity.toLocaleString("en-IN")} (transfer)`;
    }
    return quantity.toLocaleString("en-IN");
  };

  // Get badge variant for transaction type
  const getTypeBadge = (type: string) => {
    switch (type) {
      case "receipt":
        return <Badge className="bg-green-500 hover:bg-green-600">Receipt</Badge>;
      case "usage":
        return <Badge variant="destructive">Usage</Badge>;
      case "transfer_in":
        return <Badge variant="secondary">Transfer In</Badge>;
      case "transfer_out":
        return <Badge variant="outline">Transfer Out</Badge>;
      default:
        return <Badge>{type}</Badge>;
    }
  };

  // Get icon for quantity
  const getQuantityIcon = (type: string) => {
    switch (type) {
      case "receipt":
      case "transfer_in":
        return <ArrowUpCircle className="h-4 w-4 text-green-500" />;
      case "usage":
      case "transfer_out":
        return <ArrowDownCircle className="h-4 w-4 text-red-500" />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Label htmlFor="transaction-site-filter" className="shrink-0">Filter by Site:</Label>
          <Select value={selectedSiteId} onValueChange={setSelectedSiteId}>
            <SelectTrigger id="transaction-site-filter" className="w-full sm:w-64 min-h-11">
              <SelectValue placeholder="Select site" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Sites</SelectItem>
              {sites
                .filter((site) => site.status !== "completed")
                .map((site) => (
                  <SelectItem key={site.id} value={site.id}>
                    {site.name}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={handleAddNew} className="w-full sm:w-auto min-h-11">
          <Plus className="h-4 w-4 mr-2" />
          Add Transaction
        </Button>
      </div>

      {/* Mobile Cards View */}
      <div className="md:hidden space-y-3">
        {isLoading ? (
          <div className="text-center py-8">Loading transactions...</div>
        ) : transactions.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground border rounded-md">
            No transactions recorded{selectedSiteId !== "all" ? " for selected site" : ""}.
          </div>
        ) : (
          transactions.map((tx) => (
            <Card key={tx.id} className="min-h-11">
              <CardContent className="p-4 space-y-2">
                <div className="flex items-start justify-between">
                  <div className="min-h-11 flex flex-col justify-center">
                    <div className="font-medium text-slate-900">{tx.material_name}</div>
                    <div className="text-sm text-slate-500">{tx.site_name}</div>
                  </div>
                  <div className="text-xs text-muted-foreground">{formatDate(tx.created_at)}</div>
                </div>
                <div className="flex items-center gap-2">
                  {getTypeBadge(tx.transaction_type)}
                  <div className="flex items-center gap-1">
                    {getQuantityIcon(tx.transaction_type)}
                    <span
                      className={`font-medium ${
                        tx.transaction_type === "receipt" || tx.transaction_type === "transfer_in"
                          ? "text-green-600"
                          : "text-red-600"
                      }`}
                    >
                      {formatQuantity(tx.transaction_type, tx.quantity)}
                    </span>
                  </div>
                </div>
                {tx.reference_note && (
                  <div className="text-sm text-muted-foreground">
                    {tx.reference_note}
                  </div>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-full text-red-500 hover:text-red-600 min-h-11"
                  onClick={() => handleConfirmDelete(tx.id, tx.material_name)}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
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
              <TableHead>Date</TableHead>
              <TableHead>Site</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Material</TableHead>
              <TableHead className="text-right">Quantity</TableHead>
              <TableHead>Reference</TableHead>
              <TableHead className="w-16">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8">
                  Loading transactions...
                </TableCell>
              </TableRow>
            ) : transactions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  No transactions recorded{selectedSiteId !== "all" ? " for selected site" : ""}.
                </TableCell>
              </TableRow>
            ) : (
              transactions.map((tx) => (
                <TableRow key={tx.id}>
                  <TableCell className="text-muted-foreground text-sm">
                    {formatDate(tx.created_at)}
                  </TableCell>
                  <TableCell>{tx.site_name}</TableCell>
                  <TableCell>{getTypeBadge(tx.transaction_type)}</TableCell>
                  <TableCell className="font-medium">{tx.material_name}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      {getQuantityIcon(tx.transaction_type)}
                      <span
                        className={`font-medium ${
                          tx.transaction_type === "receipt" || tx.transaction_type === "transfer_in"
                            ? "text-green-600"
                            : "text-red-600"
                        }`}
                      >
                        {formatQuantity(tx.transaction_type, tx.quantity)}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm max-w-xs truncate">
                    {tx.reference_note || "-"}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-red-500 hover:text-red-600"
                      onClick={() => handleConfirmDelete(tx.id, tx.material_name)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Add Transaction Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add Transaction</DialogTitle>
            <DialogDescription>
              Record a stock receipt or usage.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="site_id">Site</Label>
                <Select
                  value={formData.site_id}
                  onValueChange={(value) => setFormData({ ...formData, site_id: value })}
                >
                  <SelectTrigger id="site_id">
                    <SelectValue placeholder="Select site" />
                  </SelectTrigger>
                  <SelectContent>
                    {sites
                      .filter((site) => site.status !== "completed")
                      .map((site) => (
                        <SelectItem key={site.id} value={site.id}>
                          {site.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                {transactionErrors.site_id && (
                  <p className="text-sm text-red-500">{transactionErrors.site_id}</p>
                )}
              </div>

              <div className="grid gap-2">
                <Label htmlFor="material_id">Material</Label>
                <Select
                  value={formData.material_id}
                  onValueChange={(value) => setFormData({ ...formData, material_id: value })}
                >
                  <SelectTrigger id="material_id">
                    <SelectValue placeholder="Select material" />
                  </SelectTrigger>
                  <SelectContent>
                    {materials.map((material) => (
                      <SelectItem key={material.id} value={material.id}>
                        {material.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {transactionErrors.material_id && (
                  <p className="text-sm text-red-500">{transactionErrors.material_id}</p>
                )}
              </div>

              <div className="grid gap-2">
                <Label htmlFor="transaction_type">Transaction Type</Label>
                <Select
                  value={formData.transaction_type}
                  onValueChange={(value: "receipt" | "usage") =>
                    setFormData({ ...formData, transaction_type: value })
                  }
                >
                  <SelectTrigger id="transaction_type">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="receipt">Receipt</SelectItem>
                    <SelectItem value="usage">Usage</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="quantity">Quantity</Label>
                <Input
                  id="quantity"
                  type="number"
                  step="0.001"
                  placeholder="Enter quantity"
                  value={formData.quantity || ""}
                  onChange={(e) => setFormData({ ...formData, quantity: parseFloat(e.target.value) || 0 })}
                />
                {transactionErrors.quantity && (
                  <p className="text-sm text-red-500">{transactionErrors.quantity}</p>
                )}
              </div>

              <div className="grid gap-2">
                <Label htmlFor="reference_note">Reference Note (Optional)</Label>
                <Input
                  id="reference_note"
                  placeholder="e.g., Supplier invoice, PO number"
                  value={formData.reference_note}
                  onChange={(e) => setFormData({ ...formData, reference_note: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsAddDialogOpen(false);
                  setFormData({
                    site_id: "",
                    material_id: "",
                    transaction_type: "receipt",
                    quantity: 0,
                    reference_note: "",
                  });
                  setTransactionErrors({});
                }}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Saving..." : "Add Transaction"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Delete Transaction?</DialogTitle>
            <DialogDescription>
              This will delete the transaction for <strong>{transactionToDeleteName}</strong> and update the stock levels.
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsDeleteDialogOpen(false);
                setTransactionToDelete(null);
                setTransactionToDeleteName("");
              }}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteTransaction.isPending}
            >
              {deleteTransaction.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Material Usage Tab Component
function MaterialUsageTab() {
  const { profile } = useAuthStore();
  const [selectedSiteId, setSelectedSiteId] = useState<string>("all");
  const [isLogDialogOpen, setIsLogDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [usageToDelete, setUsageToDelete] = useState<MaterialUsageRecord | null>(null);
  const [formErrors, setFormErrors] = useState<{
    site_id?: string;
    material_id?: string;
    quantity?: string;
    unit_price?: string;
  }>({});

  const isAdminOrOffice = profile?.role === "admin" || profile?.role === "office_manager";
  const isSupervisor = profile?.role === "supervisor";

  const { data: sites = [] } = useSites();
  const { data: assignedSites } = useAssignedSites();
  const { data: materials = [] } = useMaterials(true);
  const { data: usageRecords = [], isLoading } = useMaterialUsage({
    siteId: selectedSiteId === "all" ? null : selectedSiteId,
  });

  const createUsage = useCreateMaterialUsage();
  const approveUsage = useApproveMaterialUsage();
  const deleteUsage = useDeleteMaterialUsage();

  const [formData, setFormData] = useState<CreateMaterialUsageInput>({
    site_id: "",
    material_id: "",
    quantity: 0,
    unit_price: 0,
    usage_date: new Date().toISOString().split("T")[0],
    notes: "",
  });

  // Get available sites based on role
  const getAvailableSites = () => {
    if (isAdminOrOffice) {
      return sites.filter((site) => site.status !== "completed");
    }
    if (isSupervisor && assignedSites) {
      return sites.filter((site) =>
        assignedSites.some((as) => as.id === site.id)
      );
    }
    return [];
  };

  const availableSites = getAvailableSites();

  const validateForm = () => {
    const errors: { site_id?: string; material_id?: string; quantity?: string; unit_price?: string } = {};
    if (!formData.site_id) errors.site_id = "Site is required";
    if (!formData.material_id) errors.material_id = "Material is required";
    if (!formData.quantity || formData.quantity <= 0) {
      errors.quantity = "Quantity must be greater than 0";
    }
    if (!formData.unit_price || formData.unit_price < 0) {
      errors.unit_price = "Unit price must be 0 or greater";
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    createUsage.mutate(formData, {
      onSuccess: () => {
        setIsLogDialogOpen(false);
        setFormData({
          site_id: "",
          material_id: "",
          quantity: 0,
          unit_price: 0,
          usage_date: new Date().toISOString().split("T")[0],
          notes: "",
        });
        setFormErrors({});
      },
    });
  };

  const handleAddNew = () => {
    setFormData({
      site_id: "",
      material_id: "",
      quantity: 0,
      unit_price: 0,
      usage_date: new Date().toISOString().split("T")[0],
      notes: "",
    });
    setFormErrors({});
    setIsLogDialogOpen(true);
  };

  const handleApprove = (id: string) => {
    approveUsage.mutate(id);
  };

  const handleConfirmDelete = (record: MaterialUsageRecord) => {
    setUsageToDelete(record);
    setIsDeleteDialogOpen(true);
  };

  const handleDelete = () => {
    if (usageToDelete) {
      deleteUsage.mutate(usageToDelete.id, {
        onSuccess: () => {
          setIsDeleteDialogOpen(false);
          setUsageToDelete(null);
        },
      });
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const getStatusBadge = (state: string) => {
    if (state === "approved") {
      return <Badge className="bg-green-500 hover:bg-green-600 flex items-center gap-1"><CheckCircle className="h-3 w-3" /> Approved</Badge>;
    }
    return <Badge variant="secondary" className="flex items-center gap-1"><Clock className="h-3 w-3" /> Pending</Badge>;
  };

  const canLogUsage = isAdminOrOffice || (isSupervisor && availableSites.length > 0);
  const canApprove = isAdminOrOffice;
  const canDelete = isAdminOrOffice;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Label htmlFor="usage-site-filter" className="shrink-0">Filter by Site:</Label>
          <Select value={selectedSiteId} onValueChange={setSelectedSiteId}>
            <SelectTrigger id="usage-site-filter" className="w-full sm:w-64 min-h-11">
              <SelectValue placeholder="Select site" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Sites</SelectItem>
              {availableSites.map((site) => (
                <SelectItem key={site.id} value={site.id}>
                  {site.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {canLogUsage && (
          <Button onClick={handleAddNew} className="w-full sm:w-auto min-h-11">
            <Plus className="h-4 w-4 mr-2" />
            Log Usage
          </Button>
        )}
      </div>

      {/* Mobile Cards View */}
      <div className="md:hidden space-y-3">
        {isLoading ? (
          <div className="text-center py-8">Loading material usage...</div>
        ) : usageRecords.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground border rounded-md">
            No material usage recorded{selectedSiteId !== "all" ? " for selected site" : ""}.
          </div>
        ) : (
          usageRecords.map((record) => (
            <Card key={record.id} className="min-h-11">
              <CardContent className="p-4 space-y-2">
                <div className="flex items-start justify-between">
                  <div className="min-h-11 flex flex-col justify-center">
                    <div className="font-medium text-slate-900">{record.material?.name || "Unknown"}</div>
                    <div className="text-sm text-slate-500">{record.site?.name || "Unknown site"}</div>
                  </div>
                  {getStatusBadge(record.state)}
                </div>
                <div className="flex items-center justify-between pt-2 border-t">
                  <div className="text-sm">
                    <span className="font-medium">{record.quantity.toLocaleString("en-IN")}</span> {record.material?.unit}
                  </div>
                  <div className="font-medium text-slate-900">
                    {formatCurrency(record.total_cost)}
                  </div>
                </div>
                <div className="text-xs text-muted-foreground">
                  {formatDate(record.usage_date)}
                </div>
                {record.notes && (
                  <div className="text-sm text-muted-foreground truncate">
                    {record.notes}
                  </div>
                )}
                {record.state === "pending" && (
                  <div className="flex gap-2 pt-2">
                    {canApprove && (
                      <Button
                        size="sm"
                        className="flex-1 min-h-11"
                        onClick={() => handleApprove(record.id)}
                        disabled={approveUsage.isPending}
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Approve
                      </Button>
                    )}
                    {canDelete && (
                      <Button
                        size="sm"
                        variant="destructive"
                        className="flex-1 min-h-11"
                        onClick={() => handleConfirmDelete(record)}
                        disabled={deleteUsage.isPending}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </Button>
                    )}
                  </div>
                )}
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
              <TableHead>Date</TableHead>
              <TableHead>Site</TableHead>
              <TableHead>Material</TableHead>
              <TableHead className="text-right">Quantity</TableHead>
              <TableHead className="text-right">Unit Price</TableHead>
              <TableHead className="text-right">Total Cost</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Notes</TableHead>
              {(canApprove || canDelete) && <TableHead className="w-32">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={canApprove || canDelete ? 9 : 8} className="text-center py-8">
                  Loading material usage...
                </TableCell>
              </TableRow>
            ) : usageRecords.length === 0 ? (
              <TableRow>
                <TableCell colSpan={canApprove || canDelete ? 9 : 8} className="text-center py-8 text-muted-foreground">
                  No material usage recorded{selectedSiteId !== "all" ? " for selected site" : ""}.
                </TableCell>
              </TableRow>
            ) : (
              usageRecords.map((record) => (
                <TableRow key={record.id}>
                  <TableCell className="text-muted-foreground text-sm">
                    {formatDate(record.usage_date)}
                  </TableCell>
                  <TableCell>{record.site?.name || "-"}</TableCell>
                  <TableCell className="font-medium">{record.material?.name || "-"}</TableCell>
                  <TableCell className="text-right">
                    {record.quantity.toLocaleString("en-IN")} {record.material?.unit}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(record.unit_price)}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(record.total_cost)}
                  </TableCell>
                  <TableCell>{getStatusBadge(record.state)}</TableCell>
                  <TableCell className="text-muted-foreground text-sm max-w-xs truncate">
                    {record.notes || "-"}
                  </TableCell>
                  {(canApprove || canDelete) && (
                    <TableCell>
                      {record.state === "pending" && (
                        <div className="flex items-center gap-1">
                          {canApprove && (
                            <Button
                              size="sm"
                              onClick={() => handleApprove(record.id)}
                              disabled={approveUsage.isPending}
                            >
                              <CheckCircle className="h-4 w-4" />
                            </Button>
                          )}
                          {canDelete && (
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleConfirmDelete(record)}
                              disabled={deleteUsage.isPending}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      )}
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Log Usage Dialog */}
      <Dialog open={isLogDialogOpen} onOpenChange={setIsLogDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Log Material Usage</DialogTitle>
            <DialogDescription>
              Record materials consumed at a site. Requires approval before stock is reduced.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="site_id">Site</Label>
                <Select
                  value={formData.site_id}
                  onValueChange={(value) => setFormData({ ...formData, site_id: value })}
                >
                  <SelectTrigger id="site_id">
                    <SelectValue placeholder="Select site" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableSites.map((site) => (
                      <SelectItem key={site.id} value={site.id}>
                        {site.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {formErrors.site_id && (
                  <p className="text-sm text-red-500">{formErrors.site_id}</p>
                )}
              </div>

              <div className="grid gap-2">
                <Label htmlFor="material_id">Material</Label>
                <Select
                  value={formData.material_id}
                  onValueChange={(value) => setFormData({ ...formData, material_id: value })}
                >
                  <SelectTrigger id="material_id">
                    <SelectValue placeholder="Select material" />
                  </SelectTrigger>
                  <SelectContent>
                    {materials.filter((m) => m.is_active).map((material) => (
                      <SelectItem key={material.id} value={material.id}>
                        {material.name} ({material.unit})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {formErrors.material_id && (
                  <p className="text-sm text-red-500">{formErrors.material_id}</p>
                )}
              </div>

              <div className="grid gap-2">
                <Label htmlFor="quantity">Quantity</Label>
                <Input
                  id="quantity"
                  type="number"
                  step="0.001"
                  placeholder="Enter quantity"
                  value={formData.quantity || ""}
                  onChange={(e) => setFormData({ ...formData, quantity: parseFloat(e.target.value) || 0 })}
                />
                {formErrors.quantity && (
                  <p className="text-sm text-red-500">{formErrors.quantity}</p>
                )}
              </div>

              <div className="grid gap-2">
                <Label htmlFor="unit_price">Unit Price (₹)</Label>
                <Input
                  id="unit_price"
                  type="number"
                  step="0.01"
                  placeholder="Enter unit price"
                  value={formData.unit_price || ""}
                  onChange={(e) => setFormData({ ...formData, unit_price: parseFloat(e.target.value) || 0 })}
                />
                {formErrors.unit_price && (
                  <p className="text-sm text-red-500">{formErrors.unit_price}</p>
                )}
              </div>

              <div className="grid gap-2">
                <Label htmlFor="usage_date">Date</Label>
                <Input
                  id="usage_date"
                  type="date"
                  value={formData.usage_date}
                  onChange={(e) => setFormData({ ...formData, usage_date: e.target.value })}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="notes">Notes (Optional)</Label>
                <Input
                  id="notes"
                  placeholder="e.g., Used for foundation work"
                  value={formData.notes || ""}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsLogDialogOpen(false);
                  setFormErrors({});
                }}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={createUsage.isPending}>
                {createUsage.isPending ? "Logging..." : "Log Usage"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Material Usage?</AlertDialogTitle>
            <AlertDialogDescription>
              This will delete the pending material usage record for{" "}
              <strong>{usageToDelete?.material?.name}</strong> at{" "}
              <strong>{usageToDelete?.site?.name}</strong>.
              <br /><br />
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setIsDeleteDialogOpen(false)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-500 hover:bg-red-600"
              disabled={deleteUsage.isPending}
            >
              {deleteUsage.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// Main Stock Component
export default function Stock() {
  const { profile } = useAuthStore();
  const { data: assignedSites } = useAssignedSites();

  const isAdmin = profile?.role === "admin";
  const isOfficeManager = profile?.role === "office_manager";
  const isSupervisor = profile?.role === "supervisor";
  const canManageStock = isAdmin || isOfficeManager;
  const canViewMaterialUsage = canManageStock || (isSupervisor && (assignedSites?.length ?? 0) > 0);

  if (!canViewMaterialUsage) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-4">Stock</h1>
        <p className="text-muted-foreground">
          You do not have permission to view this page. Contact an administrator if you need access.
        </p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Stock / Inventory</h1>

      <Tabs defaultValue={canManageStock ? "materials" : "usage"} className="w-full">
        <TabsList className={`grid w-full ${canManageStock ? "max-w-lg grid-cols-4" : "max-w-xs grid-cols-1"}`}>
          {canManageStock && (
            <>
              <TabsTrigger value="materials" className="flex items-center gap-2">
                <Package className="h-4 w-4" />
                Materials
              </TabsTrigger>
              <TabsTrigger value="levels" className="flex items-center gap-2">
                <Layers className="h-4 w-4" />
                Stock Levels
              </TabsTrigger>
              <TabsTrigger value="transactions" className="flex items-center gap-2">
                <RefreshCw className="h-4 w-4" />
                Transactions
              </TabsTrigger>
            </>
          )}
          <TabsTrigger value="usage" className="flex items-center gap-2">
            <Hammer className="h-4 w-4" />
            Material Usage
          </TabsTrigger>
        </TabsList>

        {canManageStock && (
          <>
            <TabsContent value="materials" className="mt-6">
              <MaterialsTab />
            </TabsContent>

            <TabsContent value="levels" className="mt-6">
              <StockLevelsTab />
            </TabsContent>

            <TabsContent value="transactions" className="mt-6">
              <TransactionsTab />
            </TabsContent>
          </>
        )}

        <TabsContent value="usage" className="mt-6">
          <MaterialUsageTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
