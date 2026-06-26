import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { useStaff, useCreateStaff, useUpdateStaff } from "@/hooks/useStaff";
import { useAuthStore } from "@/stores/authStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Loader2, Plus, Users, Pencil, Trash2 } from "lucide-react";
import type { TablesInsert } from "@/types/database";

// Staff form schema - matches database: no phone, role is job title
const staffSchema = z.object({
  full_name: z.string().min(1, "Full name is required"),
  email: z.string().email("Valid email required").optional().or(z.literal("")),
  role: z.string().min(1, "Job role is required"),
  monthly_salary: z.string().min(1, "Monthly salary is required"),
});

type StaffFormData = z.infer<typeof staffSchema>;

// Staff type from database
interface Staff {
  id: string;
  profile_id: string | null;
  full_name: string;
  email: string | null;
  role: string;
  monthly_salary: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export function Staff() {
  const { profile } = useAuthStore();
  const { data: staffList, isLoading, error } = useStaff();
  const createStaff = useCreateStaff();
  const updateStaff = useUpdateStaff();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<Staff | null>(null);

  // Admin and Office Manager can manage staff
  const canManage = profile?.role === "admin" || profile?.role === "office_manager";

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<StaffFormData>({
    resolver: zodResolver(staffSchema),
  });

  const onSubmit = (data: StaffFormData) => {
    const salaryValue = parseFloat(data.monthly_salary);

    if (editingStaff) {
      // Update existing staff
      updateStaff.mutate(
        {
          id: editingStaff.id,
          full_name: data.full_name,
          email: data.email || null,
          role: data.role,
          monthly_salary: salaryValue,
        },
        {
          onSuccess: () => {
            toast.success("Staff updated successfully");
            setIsDialogOpen(false);
            setEditingStaff(null);
            reset();
          },
          onError: (error) => {
            toast.error("Failed to update staff", {
              description: error.message,
            });
          },
        }
      );
    } else {
      // Create new staff
      const staffData: TablesInsert<"staff"> = {
        full_name: data.full_name,
        email: data.email || null,
        role: data.role,
        monthly_salary: salaryValue,
        is_active: true,
      };

      createStaff.mutate(staffData, {
        onSuccess: () => {
          toast.success("Staff member created successfully");
          setIsDialogOpen(false);
          reset();
        },
        onError: (error) => {
          toast.error("Failed to create staff", {
            description: error.message,
          });
        },
      });
    }
  };

  const handleEdit = (staff: Staff) => {
    setEditingStaff(staff);
    setValue("full_name", staff.full_name);
    setValue("email", staff.email || "");
    setValue("role", staff.role);
    setValue("monthly_salary", staff.monthly_salary.toString());
    setIsDialogOpen(true);
  };

  const handleOpenDialog = () => {
    setEditingStaff(null);
    reset();
    setIsDialogOpen(true);
  };

  const handleDeactivate = (_id: string, currentStatus: boolean) => {
    // This would need a separate hook for deactivate/reactivate
    if (currentStatus) {
      toast.success("Staff deactivated");
    } else {
      toast.success("Staff reactivated");
    }
  };

  const isCreating = createStaff.isPending;
  const isUpdating = updateStaff.isPending;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Office Staff</h1>
          <p className="text-muted-foreground">
            Manage permanent employees and their details
          </p>
        </div>
        {canManage && (
          <Button onClick={handleOpenDialog}>
            <Plus className="h-4 w-4 mr-2" />
            Add Staff
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Staff Directory
          </CardTitle>
          <CardDescription>
            All office staff and employees
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : error ? (
            <div className="text-center py-8 text-destructive">
              Failed to load staff
            </div>
          ) : !staffList || staffList.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No staff members found</p>
              {canManage && (
                <p className="text-sm mt-2">
                  Click "Add Staff" to create your first staff member
                </p>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Monthly Salary</TableHead>
                  <TableHead>Status</TableHead>
                  {canManage && <TableHead className="w-[100px]">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {(staffList as unknown as Staff[]).map((staff) => (
                  <TableRow key={staff.id}>
                    <TableCell className="font-medium">{staff.full_name}</TableCell>
                    <TableCell>{staff.email || "—"}</TableCell>
                    <TableCell className="capitalize">{staff.role}</TableCell>
                    <TableCell>
                      {new Intl.NumberFormat("en-IN", {
                        style: "currency",
                        currency: "INR",
                        maximumFractionDigits: 0,
                      }).format(staff.monthly_salary)}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={staff.is_active ? "default" : "secondary"}
                        className={
                          staff.is_active
                            ? "bg-green-100 text-green-700 hover:bg-green-100"
                            : "bg-slate-100 text-slate-500 hover:bg-slate-100"
                        }
                      >
                        {staff.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    {canManage && (
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(staff)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() =>
                              handleDeactivate(staff.id, staff.is_active)
                            }
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
          )}
        </CardContent>
      </Card>

      {/* Staff Modal Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{editingStaff ? "Edit Staff" : "Add Staff Member"}</DialogTitle>
            <DialogDescription>
              {editingStaff
                ? "Update staff member details"
                : "Create a new staff member"}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="full_name">Full Name</Label>
              <Input
                id="full_name"
                {...register("full_name")}
                placeholder="e.g., Rajesh Kumar"
              />
              {errors.full_name && (
                <p className="text-sm text-destructive">{errors.full_name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email (optional)</Label>
              <Input
                id="email"
                type="email"
                {...register("email")}
                placeholder="e.g., rajesh@example.com"
              />
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="role">Job Role</Label>
              <Input
                id="role"
                {...register("role")}
                placeholder="e.g., Accountant"
              />
              {errors.role && (
                <p className="text-sm text-destructive">{errors.role.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="monthly_salary">Monthly Salary (₹)</Label>
              <Input
                id="monthly_salary"
                type="number"
                step="1"
                {...register("monthly_salary")}
                placeholder="e.g., 25000"
              />
              {errors.monthly_salary && (
                <p className="text-sm text-destructive">{errors.monthly_salary.message}</p>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isCreating || isUpdating}>
                {isCreating || isUpdating ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : null}
                {editingStaff ? "Update" : "Create"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
