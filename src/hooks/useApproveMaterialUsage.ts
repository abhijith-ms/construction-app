import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

export function useApproveMaterialUsage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (usageId: string) => {
      const { data, error } = await supabase.rpc("approve_material_usage", {
        p_usage_id: usageId,
      });

      if (error) {
        if (error.message.includes("insufficient_privilege")) {
          throw new Error("Only Admin or Office Manager can approve material usage");
        }
        if (error.message.includes("already approved")) {
          throw new Error("Material usage is already approved");
        }
        throw new Error(error.message);
      }

      return data;
    },
    onSuccess: () => {
      toast.success("Material usage approved successfully");
      queryClient.invalidateQueries({ queryKey: ["materialUsage"] });
      queryClient.invalidateQueries({ queryKey: ["stockLevels"] });
      queryClient.invalidateQueries({ queryKey: ["stockTransactions"] });
      queryClient.invalidateQueries({ queryKey: ["siteDashboard"] });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to approve material usage");
    },
  });
}
