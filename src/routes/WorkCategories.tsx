import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { useWorkCategories } from "@/hooks/useWorkCategories";
import { useCreateWorkCategory } from "@/hooks/useCreateWorkCategory";
import { useUpdateWorkCategory } from "@/hooks/useUpdateWorkCategory";
import { useAuthStore } from "@/stores/authStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
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
import { Loader2, Plus } from "lucide-react";

const workCategorySchema = z.object({
  name: z.string().trim().min(1, "Category name is required").toLowerCase(),
});

type WorkCategoryFormData = z.infer<typeof workCategorySchema>;

export function WorkCategories() {
  const { profile } = useAuthStore();
  const isAdmin = profile?.role === "admin";
  const isOfficeManager = profile?.role === "office_manager";

  const { data: categories, isLoading, error } = useWorkCategories();
  const { mutate: createCategory, isPending: isCreating } = useCreateWorkCategory();
  const { mutate: updateCategory } = useUpdateWorkCategory();
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<WorkCategoryFormData>({
    resolver: zodResolver(workCategorySchema),
  });

  // Page should only be accessible to Admin and Office Manager
  if (!isAdmin && !isOfficeManager) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <p className="text-muted-foreground">
          You do not have permission to view this page.
        </p>
      </div>
    );
  }

  const onSubmit = (data: WorkCategoryFormData) => {
    createCategory(
      { name: data.name },
      {
        onSuccess: () => {
          toast.success("Work category created");
          setIsDialogOpen(false);
          reset();
        },
        onError: (err) => {
          const description = err.message.includes("duplicate key")
            ? "A category with this name already exists."
            : "You may not have permission to perform this action.";
          toast.error("Failed to create work category", { description });
        },
      }
    );
  };

  const handleToggle = (id: string, currentIsActive: boolean) => {
    updateCategory(
      { id, isActive: !currentIsActive },
      {
        onSuccess: () => {
          toast.success(currentIsActive ? "Category retired" : "Category reactivated");
        },
        onError: () => {
          toast.error("Failed to update category", {
            description: "You may not have permission to perform this action.",
          });
        },
      }
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Work Categories</h1>
          <p className="text-slate-500 mt-1">
            Manage the job types available when assigning workers and marking attendance
          </p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2 w-full sm:w-auto">
              <Plus className="h-4 w-4" />
              Add Category
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Add Work Category</DialogTitle>
              <DialogDescription>
                Once created, a category's name can't be changed — retire it
                and add a new one instead if it needs to change.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Category Name *</Label>
                <Input id="name" placeholder="e.g., tiler" {...register("name")} />
                {errors.name && (
                  <p className="text-sm text-destructive">{errors.name.message}</p>
                )}
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isCreating}>
                  {isCreating && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  Create
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Categories</CardTitle>
          <CardDescription>
            Retiring a category removes it from new selections but keeps it
            visible on any existing records that already use it.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
            </div>
          ) : error ? (
            <div className="text-center py-8 text-destructive">
              Error loading work categories. Please try again.
            </div>
          ) : categories?.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              No work categories yet. Add your first one above.
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
                      Status
                    </th>
                    <th className="text-right py-3 px-4 font-semibold text-slate-700">
                      Active
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {categories?.map((category) => (
                    <tr key={category.id} className="hover:bg-slate-50">
                      <td className="py-3 px-4 capitalize font-medium">
                        {category.name}
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant={category.is_active ? "default" : "secondary"}>
                          {category.is_active ? "Active" : "Retired"}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Switch
                          checked={category.is_active}
                          onCheckedChange={() =>
                            handleToggle(category.id, category.is_active)
                          }
                        />
                      </td>
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
