import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

export function useDeleteMaterialUsage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (usageId: string) => {
      const { error } = await supabase
        .from("material_usage")
        .delete()
        .eq("id", usageId);

      if (error) {
        if (error.message.includes("row-level security")) {
          throw new Error("Permission denied: Only Admin or Office Manager can delete material usage");
        }
        throw new Error(error.message);
      }

      return { success: true };
    },
    onSuccess: () => {
      toast.success("Material usage deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["materialUsage"] });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to delete material usage");
    },
  });
}
